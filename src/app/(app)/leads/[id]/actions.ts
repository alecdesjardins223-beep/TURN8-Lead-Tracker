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

const VALID_STATUSES = new Set(Object.values(LeadStatus));

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
          ...draft,
        },
      },
    },
  });

  revalidatePath(`/leads/${leadId}`);
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

export async function updateContactInfo(leadId: string, formData: FormData): Promise<void> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return;

  const email       = formData.get("email");
  const phone       = formData.get("phone");
  const linkedinUrl = formData.get("linkedinUrl");

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      email:       typeof email       === "string" ? email.trim()       || null : undefined,
      phone:       typeof phone       === "string" ? phone.trim()       || null : undefined,
      linkedinUrl: typeof linkedinUrl === "string" ? linkedinUrl.trim() || null : undefined,
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
