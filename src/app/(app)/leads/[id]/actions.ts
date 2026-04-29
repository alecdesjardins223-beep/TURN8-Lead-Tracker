"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LeadStatus } from "@prisma/client";
import { getResearchProvider, mergeResearch, prependToHistory } from "@/lib/research";
import type { StoredBrief } from "@/lib/research";
import { getDraftProvider } from "@/lib/draft";
import { getPlaybookConfig } from "@/lib/playbooks";
import { scoreResearch } from "@/lib/scoring";
import { getEnrichmentProvider, resolveUsableEmail } from "@/lib/enrichment";
import type { ContactFieldRecord, ContactConfidence } from "@/lib/enrichment";
import { sendEmail } from "@/lib/email";

export type SendDraftState = { ok: boolean; error?: string } | null;

const VALID_STATUSES = new Set(Object.values(LeadStatus));

// ─── Contact enrichment helpers ───────────────────────────────────────────────

function confidenceRank(c: ContactConfidence): number {
  return { verified: 3, likely: 2, inferred: 1, manual: 2 }[c] ?? 0;
}

// Merge rule: manual always wins; otherwise higher-confidence incoming wins;
// equal confidence prefers incoming (more recent).
function mergeContactField(
  existing: ContactFieldRecord | null | undefined,
  incoming: ContactFieldRecord,
): ContactFieldRecord {
  if (!existing?.value) return incoming;
  if (existing.source === "manual") return existing;
  if (confidenceRank(incoming.confidence) >= confidenceRank(existing.confidence)) return incoming;
  return existing;
}

export async function researchLead(leadId: string, _formData: FormData): Promise<void> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return;

  const lead = await prisma.lead.findUnique({
    where:   { id: leadId },
    include: { playbook: { select: { id: true } } },
  });
  if (!lead) return;

  const playbookCfg = lead.playbook?.id ? getPlaybookConfig(lead.playbook.id) : undefined;
  const provider = getResearchProvider();

  let brief;
  try {
    brief = await provider.research({
      firstName:   lead.firstName,
      lastName:    lead.lastName,
      title:       lead.title,
      company:     lead.company,
      location:    lead.location,
      linkedinUrl: lead.linkedinUrl,
      archetype:   lead.archetype,
      playbook: playbookCfg
        ? {
            name:             playbookCfg.name,
            persona:          playbookCfg.persona,
            signalFocus:      playbookCfg.signalFocus,
            researchGuidance: playbookCfg.researchGuidance,
          }
        : null,
    });
  } catch (err) {
    console.error("[researchLead] provider error:", err);
    return;
  }

  // Re-read fresh metadata immediately before writing so concurrent writes
  // (e.g. a draft that completed while Perplexity was in-flight) are preserved.
  const fresh = await prisma.lead.findUnique({
    where:  { id: leadId },
    select: { metadata: true },
  });
  const latestMeta = (fresh?.metadata as Record<string, unknown>) ?? {};

  const incoming: StoredBrief = {
    generatedAt: new Date().toISOString(),
    provider:    provider.name,
    playbookId:  lead.playbook?.id ?? null,
    ...brief,
  };

  const current = (latestMeta.research ?? null) as StoredBrief | null;
  const history = ((latestMeta.researchHistory ?? []) as StoredBrief[]);

  const merged     = mergeResearch(current, incoming);
  const newHistory = prependToHistory(history, incoming);
  const score      = scoreResearch(merged, lead.playbook?.id ?? null);

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      metadata: {
        ...latestMeta,
        // Spread to plain objects so Prisma's InputJsonValue constraint is satisfied.
        research:        { ...merged },
        researchHistory: newHistory.map((h) => ({ ...h, sources: [...h.sources] })),
        score: {
          ...score,
          factors: { ...score.factors },
          weights: { ...score.weights },
        },
      },
    },
  });

  revalidatePath(`/leads/${leadId}`);
}

export async function generateDraft(leadId: string, _formData: FormData): Promise<void> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return;

  const lead = await prisma.lead.findUnique({
    where:   { id: leadId },
    include: { playbook: { select: { id: true } } },
  });
  if (!lead) return;

  const meta     = (lead.metadata as Record<string, unknown>) ?? {};
  const research = (meta.research ?? null) as Record<string, string> | null;
  if (!research) return;

  const playbookCfg = lead.playbook?.id ? getPlaybookConfig(lead.playbook.id) : undefined;
  const provider = getDraftProvider();

  let draft;
  try {
    draft = await provider.generate({
      firstName:     lead.firstName,
      lastName:      lead.lastName,
      title:         lead.title,
      company:       lead.company,
      summary:       research.summary       ?? "",
      relevance:     research.relevance     ?? "",
      signals:       research.signals       ?? "",
      outreachAngle: research.outreachAngle ?? "",
      playbook: playbookCfg
        ? {
            name:             playbookCfg.name,
            outreachGuidance: playbookCfg.outreachGuidance,
          }
        : null,
    });
  } catch (err) {
    console.error("[generateDraft] provider error:", err);
    return;
  }

  // Re-read fresh metadata before writing.
  const fresh = await prisma.lead.findUnique({
    where:  { id: leadId },
    select: { metadata: true },
  });
  const latestMeta = (fresh?.metadata as Record<string, unknown>) ?? {};

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      metadata: {
        ...latestMeta,
        draft: {
          generatedAt: new Date().toISOString(),
          provider:    provider.name,
          status:      "generated",
          ...draft,
        },
      },
    },
  });

  revalidatePath(`/leads/${leadId}`);
}

export async function saveDraftEdits(leadId: string, formData: FormData): Promise<void> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return;

  const rawSubject = formData.get("subject");
  const rawBody    = formData.get("body");
  if (typeof rawSubject !== "string" || typeof rawBody !== "string") return;

  const subject = rawSubject.trim();
  const body    = rawBody.trim();
  if (!subject || !body) return;

  const fresh = await prisma.lead.findUnique({
    where:  { id: leadId },
    select: { metadata: true },
  });
  if (!fresh) return;

  const latestMeta    = (fresh.metadata as Record<string, unknown>) ?? {};
  const currentDraft  = (latestMeta.draft as Record<string, unknown> | null);
  if (!currentDraft) return;

  const currentStatus = (currentDraft.status as string | undefined) ?? "generated";
  // Editing a verified draft resets it to generated
  const newStatus     = currentStatus === "verified" ? "generated" : currentStatus;

  const updatedDraft: Record<string, unknown> = {
    ...currentDraft,
    subject,
    body,
    status:   newStatus,
    editedAt: new Date().toISOString(),
  };
  if (newStatus !== "verified") delete updatedDraft.verifiedAt;

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      metadata: {
        ...latestMeta,
        draft: JSON.parse(JSON.stringify(updatedDraft)),
      },
    },
  });

  revalidatePath(`/leads/${leadId}`);
}

export async function verifyDraft(leadId: string, _formData: FormData): Promise<void> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return;

  const fresh = await prisma.lead.findUnique({
    where:  { id: leadId },
    select: { metadata: true },
  });
  if (!fresh) return;

  const latestMeta   = (fresh.metadata as Record<string, unknown>) ?? {};
  const currentDraft = (latestMeta.draft as Record<string, unknown> | null);
  if (!currentDraft) return;

  const currentStatus = (currentDraft.status as string | undefined) ?? "generated";
  if (currentStatus === "sent") return;

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      metadata: {
        ...latestMeta,
        draft: {
          ...currentDraft,
          status:     "verified",
          verifiedAt: new Date().toISOString(),
        },
      },
    },
  });

  revalidatePath(`/leads/${leadId}`);
}

// Returns state so DraftSection can surface send errors via useActionState.
export async function sendDraft(
  leadId: string,
  _prev: SendDraftState,
  _formData: FormData,
): Promise<SendDraftState> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { ok: false, error: "Not authenticated" };

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return { ok: false, error: "Lead not found" };

  const meta         = (lead.metadata as Record<string, unknown>) ?? {};
  const currentDraft = (meta.draft as Record<string, unknown> | null);
  if (!currentDraft) return { ok: false, error: "No draft" };

  const draftStatus = (currentDraft.status as string | undefined) ?? "generated";
  if (draftStatus !== "verified") return { ok: false, error: "Draft must be verified before sending" };

  const enrichedContacts = (meta.enrichedContacts as Record<string, unknown> | null);
  const enrichedEmail    = enrichedContacts?.workEmail as { value: string; confidence: string } | null | undefined;
  const usableEmail      = resolveUsableEmail(lead.email, enrichedEmail);

  if (!usableEmail) return { ok: false, error: "No usable email address for this lead" };

  const result = await sendEmail({
    to:      usableEmail,
    subject: currentDraft.subject as string,
    text:    currentDraft.body    as string,
  });

  if (!result.ok) return { ok: false, error: result.error ?? "Send failed" };

  // Re-read to avoid clobbering concurrent writes
  const freshAfter = await prisma.lead.findUnique({
    where:  { id: leadId },
    select: { metadata: true },
  });
  const latestMeta  = (freshAfter?.metadata as Record<string, unknown>) ?? {};
  const latestDraft = (latestMeta.draft as Record<string, unknown> | null) ?? currentDraft;

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      metadata: {
        ...latestMeta,
        draft: {
          ...latestDraft,
          status: "sent",
          sentAt: new Date().toISOString(),
        },
      },
    },
  });

  await prisma.leadActivity.create({
    data: {
      leadId,
      type:     "EMAIL_SENT",
      body:     `Subject: ${currentDraft.subject as string}`,
      metadata: JSON.parse(JSON.stringify({
        to:        usableEmail,
        subject:   currentDraft.subject,
        sentVia:   "resend",
        messageId: result.id ?? null,
      })),
    },
  });

  revalidatePath(`/leads/${leadId}`);
  return { ok: true };
}

export async function updateLeadPlaybook(leadId: string, formData: FormData): Promise<void> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return;

  const raw = formData.get("playbookId");
  const playbookId = typeof raw === "string" && raw.trim() ? raw.trim() : null;

  await prisma.lead.update({
    where: { id: leadId },
    data:  { playbookId },
  });

  revalidatePath(`/leads/${leadId}`);
}

export async function enrichLead(leadId: string, _formData: FormData): Promise<void> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return;

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return;

  const provider = getEnrichmentProvider();

  let result;
  try {
    result = await provider.enrich({
      firstName:   lead.firstName,
      lastName:    lead.lastName,
      title:       lead.title,
      company:     lead.company,
      location:    lead.location,
      linkedinUrl: lead.linkedinUrl,
      email:       lead.email,
    });
  } catch (err) {
    console.error("[enrichLead] provider error:", err);
    return;
  }

  // Re-read fresh to get the latest canonical values and metadata.
  const fresh = await prisma.lead.findUnique({
    where:  { id: leadId },
    select: { metadata: true, email: true, linkedinUrl: true },
  });
  if (!fresh) return;

  const latestMeta  = (fresh.metadata as Record<string, unknown>) ?? {};
  const existingEnr = (latestMeta.enrichedContacts as Record<string, unknown> | null) ?? {};
  const now         = new Date().toISOString();

  // Wrap each provider result field and merge with existing records.
  const merged: Record<string, unknown> = {
    ...existingEnr,
    enrichedAt: now,
    provider:   provider.name,
  };

  const fields = [
    { key: "workEmail",      incoming: result.workEmail },
    { key: "phone",          incoming: result.phone },
    { key: "linkedinUrl",    incoming: result.linkedinUrl },
    { key: "companyWebsite", incoming: result.companyWebsite },
  ] as const;

  for (const { key, incoming } of fields) {
    if (!incoming) continue;
    const incomingRecord: ContactFieldRecord = {
      value:       incoming.value,
      source:      "enrichment",
      confidence:  incoming.confidence,
      lastUpdated: now,
    };
    const existing = (existingEnr[key] as ContactFieldRecord | null | undefined) ?? null;
    merged[key] = mergeContactField(existing, incomingRecord);
  }

  // Backfill empty canonical columns — safe only, never overwrite existing values.
  const canonicalUpdates: { email?: string; linkedinUrl?: string } = {};
  const mergedEmail     = merged.workEmail   as ContactFieldRecord | null | undefined;
  const mergedLinkedin  = merged.linkedinUrl as ContactFieldRecord | null | undefined;
  if (!fresh.email       && mergedEmail?.source    === "enrichment" && mergedEmail.value)    canonicalUpdates.email       = mergedEmail.value;
  if (!fresh.linkedinUrl && mergedLinkedin?.source === "enrichment" && mergedLinkedin.value) canonicalUpdates.linkedinUrl = mergedLinkedin.value;

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      ...canonicalUpdates,
      metadata: {
        ...latestMeta,
        enrichedContacts: JSON.parse(JSON.stringify(merged)),
      },
    },
  });

  revalidatePath(`/leads/${leadId}`);
}

export async function updateContactInfo(leadId: string, formData: FormData): Promise<void> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return;

  const rawEmail       = formData.get("email");
  const rawPhone       = formData.get("phone");
  const rawLinkedinUrl = formData.get("linkedinUrl");

  const email       = typeof rawEmail       === "string" ? rawEmail.trim()       || null : undefined;
  const phone       = typeof rawPhone       === "string" ? rawPhone.trim()       || null : undefined;
  const linkedinUrl = typeof rawLinkedinUrl === "string" ? rawLinkedinUrl.trim() || null : undefined;

  // Read current metadata AND canonical values.
  // We compare each incoming value against the current DB value so that form fields
  // the user didn't touch (pre-filled with the existing value) never trigger a
  // metadata update for fields they didn't edit.
  const fresh = await prisma.lead.findUnique({
    where:  { id: leadId },
    select: { metadata: true, email: true, phone: true, linkedinUrl: true },
  });
  const latestMeta  = (fresh?.metadata as Record<string, unknown>) ?? {};
  const existingEnr = (latestMeta.enrichedContacts as Record<string, unknown> | null) ?? {};
  const now         = new Date().toISOString();

  const updatedEnr: Record<string, unknown> = { ...existingEnr };

  // Only update metadata for a field when its value actually changed.
  if (email !== undefined && email !== (fresh?.email ?? null)) {
    updatedEnr.workEmail = email
      ? { value: email, source: "manual", confidence: "manual", lastUpdated: now }
      : null;
  }
  if (phone !== undefined && phone !== (fresh?.phone ?? null)) {
    updatedEnr.phone = phone
      ? { value: phone, source: "manual", confidence: "manual", lastUpdated: now }
      : null;
  }
  if (linkedinUrl !== undefined && linkedinUrl !== (fresh?.linkedinUrl ?? null)) {
    updatedEnr.linkedinUrl = linkedinUrl
      ? { value: linkedinUrl, source: "manual", confidence: "manual", lastUpdated: now }
      : null;
  }

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      email,
      phone,
      linkedinUrl,
      metadata: {
        ...latestMeta,
        enrichedContacts: JSON.parse(JSON.stringify(updatedEnr)),
      },
    },
  });

  revalidatePath(`/leads/${leadId}`);
}

export async function deleteNote(leadId: string, noteId: string): Promise<void> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return;

  const activity = await prisma.leadActivity.findUnique({ where: { id: noteId } });
  if (!activity || activity.leadId !== leadId || activity.type !== "NOTE") return;

  await prisma.leadActivity.delete({ where: { id: noteId } });

  revalidatePath(`/leads/${leadId}`);
}

export async function createNote(leadId: string, formData: FormData): Promise<void> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return;

  const body = formData.get("body");
  if (typeof body !== "string" || body.trim() === "") return;

  await prisma.leadActivity.create({
    data: { leadId, type: "NOTE", body: body.trim() },
  });

  revalidatePath(`/leads/${leadId}`);
}

export async function updateLeadStatus(
  leadId: string,
  formData: FormData,
): Promise<void> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return;

  const raw = formData.get("status");
  if (typeof raw !== "string" || !VALID_STATUSES.has(raw as LeadStatus)) return;

  await prisma.lead.update({
    where: { id: leadId },
    data: { status: raw as LeadStatus },
  });

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
  revalidatePath("/dashboard");
}
