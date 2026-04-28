import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LeadStatus } from "@prisma/client";
import { formatArchetype, formatStatus } from "@/lib/utils";
import {
  updateLeadStatus,
  createNote,
  deleteNote,
  researchLead,
  generateDraft,
  updateContactInfo,
  updateLeadPlaybook,
  enrichLead,
} from "./actions";
import type { StoredBrief } from "@/lib/research";
import type { EmailDraft } from "@/lib/draft";
import type { LeadScore, PriorityLabel } from "@/lib/scoring";
import type { EnrichedContacts, ContactConfidence } from "@/lib/enrichment";
import { getPlaybookConfig } from "@/lib/playbooks";
import { SubmitButton } from "./SubmitButton";

export const metadata: Metadata = { title: "Lead" };

const STATUS_CLASSES: Record<LeadStatus, string> = {
  IDENTIFIED:     "bg-slate-100 text-slate-600",
  RESEARCHED:     "bg-blue-50 text-blue-700",
  OUTREACH_READY: "bg-indigo-50 text-indigo-700",
  CONTACTED:      "bg-amber-50 text-amber-700",
  ENGAGED:        "bg-green-50 text-green-700",
  CONVERTED:      "bg-emerald-50 text-emerald-700",
  ARCHIVED:       "bg-slate-100 text-slate-400",
};

const ALL_STATUSES = Object.values(LeadStatus);

const INPUT_CLS =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

const ACTION_BTN_CLS =
  "rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40";

const SCORE_LABEL_CLASSES: Record<PriorityLabel, string> = {
  "High Priority": "bg-green-100 text-green-800",
  "Review":        "bg-amber-50 text-amber-700",
  "Monitor":       "bg-slate-100 text-slate-600",
  "Low Fit":       "bg-slate-50 text-slate-400",
};

const CONTACT_CONF_CLS: Record<ContactConfidence, string> = {
  manual:   "bg-slate-100 text-slate-600",
  verified: "bg-green-50 text-green-700",
  likely:   "bg-amber-50 text-amber-700",
  inferred: "bg-slate-100 text-slate-500",
};

const SCORE_FACTORS: Array<{ key: keyof LeadScore["factors"]; label: string }> = [
  { key: "triggerStrength",  label: "Trigger"    },
  { key: "personaFit",       label: "Persona"    },
  { key: "complexityNeed",   label: "Complexity" },
  { key: "evidenceQuality",  label: "Evidence"   },
];

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [lead, playbooks] = await Promise.all([
    prisma.lead.findUnique({
      where: { id },
      include: {
        assignedTo:    { select: { name: true, email: true } },
        playbook:      { select: { id: true, name: true } },
        searchProfile: { select: { id: true, name: true } },
        activities: {
          where:   { type: "NOTE" },
          orderBy: { createdAt: "desc" },
          select:  { id: true, body: true, createdAt: true },
        },
      },
    }),
    prisma.playbook.findMany({
      where:   { isActive: true },
      select:  { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!lead) notFound();

  const action               = updateLeadStatus.bind(null, lead.id);
  const noteAction           = createNote.bind(null, lead.id);
  const researchAction       = researchLead.bind(null, lead.id);
  const draftAction          = generateDraft.bind(null, lead.id);
  const updateContactAction  = updateContactInfo.bind(null, lead.id);
  const updatePlaybookAction = updateLeadPlaybook.bind(null, lead.id);
  const enrichAction         = enrichLead.bind(null, lead.id);

  const playbookConfig  = lead.playbook?.id ? getPlaybookConfig(lead.playbook.id) : null;
  const meta            = lead.metadata as Record<string, unknown>;
  const research        = (meta?.research        ?? null) as StoredBrief | null;
  const researchHistory = ((meta?.researchHistory ?? []) as StoredBrief[]);
  const draft           = (meta?.draft           ?? null) as (EmailDraft & { generatedAt: string; provider: string }) | null;
  const score           = (meta?.score           ?? null) as LeadScore | null;
  const enrichedContacts = (meta?.enrichedContacts ?? null) as EnrichedContacts | null;

  const researchPlaybookName = research?.playbookId
    ? (playbooks.find((p) => p.id === research.playbookId)?.name ?? null)
    : null;

  return (
    <div className="page-container">
      <div className="page-header">
        <nav className="flex items-center gap-1.5 text-sm text-slate-500 mb-2">
          <Link href="/leads" className="hover:text-slate-900">
            Leads
          </Link>
          <span>/</span>
          <span className="truncate max-w-xs text-slate-700">
            {lead.firstName} {lead.lastName}
          </span>
        </nav>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="page-title">
                {lead.firstName} {lead.lastName}
              </h1>
              <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                {formatArchetype(lead.archetype)}
              </span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASSES[lead.status]}`}>
                {formatStatus(lead.status)}
              </span>
            </div>
            {(lead.title || lead.company) && (
              <p className="page-subtitle">
                {[lead.title, lead.company].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: details */}
        <div className="lg:col-span-2 space-y-6">

          {/* Contact Info */}
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-900">Contact Info</h2>
              <form action={enrichAction}>
                <SubmitButton pendingLabel="Enriching…" className={ACTION_BTN_CLS}>
                  {enrichedContacts ? "Re-run enrichment" : "Run enrichment"}
                </SubmitButton>
              </form>
            </div>

            {/* Read-only display with confidence badges */}
            <dl className="space-y-3 text-sm mb-4">
              {(lead.email || enrichedContacts?.workEmail) && (
                <div className="flex gap-4">
                  <dt className="w-28 shrink-0 text-slate-500">Email</dt>
                  <dd className="flex flex-wrap items-baseline gap-1.5 break-all">
                    <span className="text-slate-900">
                      {lead.email ?? enrichedContacts?.workEmail?.value}
                    </span>
                    {enrichedContacts?.workEmail && (
                      <span className={`rounded-full px-1.5 py-0.5 text-xs ${CONTACT_CONF_CLS[enrichedContacts.workEmail.confidence]}`}>
                        {enrichedContacts.workEmail.confidence}
                        {enrichedContacts.workEmail.confidence !== "manual" && ` · ${enrichedContacts.workEmail.source}`}
                      </span>
                    )}
                  </dd>
                </div>
              )}
              {(lead.phone || enrichedContacts?.phone) && (
                <div className="flex gap-4">
                  <dt className="w-28 shrink-0 text-slate-500">Phone</dt>
                  <dd className="flex flex-wrap items-baseline gap-1.5">
                    <span className="text-slate-900">
                      {lead.phone ?? enrichedContacts?.phone?.value}
                    </span>
                    {enrichedContacts?.phone && (
                      <span className={`rounded-full px-1.5 py-0.5 text-xs ${CONTACT_CONF_CLS[enrichedContacts.phone.confidence]}`}>
                        {enrichedContacts.phone.confidence}
                        {enrichedContacts.phone.confidence !== "manual" && ` · ${enrichedContacts.phone.source}`}
                      </span>
                    )}
                  </dd>
                </div>
              )}
              {(lead.linkedinUrl || enrichedContacts?.linkedinUrl) && (
                <div className="flex gap-4">
                  <dt className="w-28 shrink-0 text-slate-500">LinkedIn</dt>
                  <dd>
                    <a
                      href={lead.linkedinUrl ?? enrichedContacts?.linkedinUrl?.value ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-600 hover:text-brand-700 truncate block max-w-sm"
                    >
                      {lead.linkedinUrl ?? enrichedContacts?.linkedinUrl?.value}
                    </a>
                    {enrichedContacts?.linkedinUrl && (
                      <span className={`mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-xs ${CONTACT_CONF_CLS[enrichedContacts.linkedinUrl.confidence]}`}>
                        {enrichedContacts.linkedinUrl.confidence}
                        {enrichedContacts.linkedinUrl.confidence !== "manual" && ` · ${enrichedContacts.linkedinUrl.source}`}
                      </span>
                    )}
                  </dd>
                </div>
              )}
              {enrichedContacts?.companyWebsite && (
                <div className="flex gap-4">
                  <dt className="w-28 shrink-0 text-slate-500">Website</dt>
                  <dd className="flex flex-wrap items-baseline gap-1.5">
                    <a
                      href={enrichedContacts.companyWebsite.value}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-600 hover:text-brand-700 truncate max-w-sm"
                    >
                      {enrichedContacts.companyWebsite.value}
                    </a>
                    <span className={`rounded-full px-1.5 py-0.5 text-xs ${CONTACT_CONF_CLS[enrichedContacts.companyWebsite.confidence]}`}>
                      {enrichedContacts.companyWebsite.confidence} · {enrichedContacts.companyWebsite.source}
                    </span>
                  </dd>
                </div>
              )}
              {lead.location && (
                <div className="flex gap-4">
                  <dt className="w-28 shrink-0 text-slate-500">Location</dt>
                  <dd className="text-slate-900">{lead.location}</dd>
                </div>
              )}
              {lead.notes && (
                <div className="flex gap-4">
                  <dt className="w-28 shrink-0 text-slate-500">Notes</dt>
                  <dd className="text-slate-700 whitespace-pre-wrap">{lead.notes}</dd>
                </div>
              )}
              {!lead.email && !lead.phone && !lead.linkedinUrl && !lead.location && !lead.notes && !enrichedContacts && (
                <p className="text-slate-400">No contact details — add them below or run enrichment.</p>
              )}
            </dl>

            {enrichedContacts && (
              <p className="mb-4 text-xs text-slate-400">
                Enriched {new Date(enrichedContacts.enrichedAt).toLocaleDateString("en-US", {
                  month: "short", day: "numeric", year: "numeric",
                })} via {enrichedContacts.provider}
              </p>
            )}

            {/* Inline edit form for contact fields */}
            <div className="border-t border-slate-100 pt-4">
              <p className="text-xs font-medium text-slate-500 mb-3">Edit contact details</p>
              <form action={updateContactAction} className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="ci-email" className="block text-xs text-slate-500 mb-1">
                      Email
                    </label>
                    <input
                      id="ci-email"
                      name="email"
                      type="email"
                      defaultValue={lead.email ?? ""}
                      placeholder="name@example.com"
                      className={INPUT_CLS}
                    />
                  </div>
                  <div>
                    <label htmlFor="ci-phone" className="block text-xs text-slate-500 mb-1">
                      Phone
                    </label>
                    <input
                      id="ci-phone"
                      name="phone"
                      type="tel"
                      defaultValue={lead.phone ?? ""}
                      placeholder="+1 555 000 0000"
                      className={INPUT_CLS}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="ci-linkedin" className="block text-xs text-slate-500 mb-1">
                    LinkedIn URL
                  </label>
                  <input
                    id="ci-linkedin"
                    name="linkedinUrl"
                    defaultValue={lead.linkedinUrl ?? ""}
                    placeholder="https://linkedin.com/in/..."
                    className={INPUT_CLS}
                  />
                </div>
                <div className="flex justify-end">
                  <SubmitButton
                    pendingLabel="Saving…"
                    className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50"
                  >
                    Save contact info
                  </SubmitButton>
                </div>
              </form>
            </div>
          </div>

          {/* Status update */}
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Update Status</h2>
            <form action={action} className="flex items-center gap-3">
              <select
                key={lead.status}
                name="status"
                defaultValue={lead.status}
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {formatStatus(s)}
                  </option>
                ))}
              </select>
              <SubmitButton
                pendingLabel="Saving…"
                className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50"
              >
                Save
              </SubmitButton>
            </form>
          </div>

          {/* Research Brief */}
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-900">Research Brief</h2>
              <form action={researchAction}>
                <SubmitButton pendingLabel="Researching…" className={ACTION_BTN_CLS}>
                  {research ? "Re-run research" : "Research this lead"}
                </SubmitButton>
              </form>
            </div>

            {research && score && (
              <div className="mb-4 rounded-md border border-slate-100 bg-slate-50 px-3 py-2.5">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${SCORE_LABEL_CLASSES[score.label]}`}>
                    {score.label}
                  </span>
                  <span className="text-sm font-semibold text-slate-700">{score.total}</span>
                  <span className="text-xs text-slate-400">/100</span>
                  <span className="text-xs text-slate-500 leading-snug">{score.rationale}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
                  {SCORE_FACTORS.map(({ key, label }) => (
                    <span key={key} className="flex items-center gap-1.5 text-xs text-slate-500">
                      <span className="w-16 shrink-0">{label}</span>
                      <span className="flex gap-0.5">
                        {([1, 2, 3] as const).map((i) => (
                          <span
                            key={i}
                            className={`inline-block h-1.5 w-4 rounded-full ${
                              score.factors[key] >= i ? "bg-slate-500" : "bg-slate-200"
                            }`}
                          />
                        ))}
                      </span>
                      <span className="text-slate-400">{score.factors[key]}/3</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {research ? (
              <dl className="space-y-4 text-sm">
                <div>
                  <dt className="font-medium text-slate-700">Summary</dt>
                  <dd className="mt-1 text-slate-600">{research.summary}</dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-700">Why relevant</dt>
                  <dd className="mt-1 text-slate-600">{research.relevance}</dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-700">Public signals</dt>
                  <dd className="mt-1 text-slate-600">{research.signals}</dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-700">Suggested outreach angle</dt>
                  <dd className="mt-1 text-slate-600">{research.outreachAngle}</dd>
                </div>
                {research.sources.length > 0 && (
                  <div>
                    <dt className="font-medium text-slate-700">Sources</dt>
                    <dd className="mt-1 space-y-1">
                      {research.sources.map((src, i) => (
                        <a
                          key={i}
                          href={src}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block truncate text-xs text-brand-600 hover:text-brand-700"
                        >
                          {src}
                        </a>
                      ))}
                    </dd>
                  </div>
                )}
                <p className="text-xs text-slate-400">
                  Last updated {new Date(research.generatedAt).toLocaleDateString("en-US", {
                    month: "short", day: "numeric", year: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })} via {research.provider}
                  {researchPlaybookName && (
                    <span className="ml-1">· {researchPlaybookName} playbook</span>
                  )}
                  {researchHistory.length > 0 && (
                    <span className="ml-1">
                      · {researchHistory.length} run{researchHistory.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </p>
              </dl>
            ) : (
              <p className="text-sm text-slate-400">
                No research brief yet — click "Research this lead" to generate one.
              </p>
            )}
          </div>

          {/* Draft Email */}
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-900">Draft Email</h2>
              <form action={draftAction}>
                <SubmitButton
                  pendingLabel="Generating…"
                  disabled={!research}
                  className={ACTION_BTN_CLS}
                >
                  {draft ? "Re-generate draft" : "Generate draft"}
                </SubmitButton>
              </form>
            </div>

            {draft ? (
              <div className="space-y-4 text-sm">
                <div>
                  <p className="font-medium text-slate-700">Subject</p>
                  <p className="mt-1 text-slate-900">{draft.subject}</p>
                </div>
                <div>
                  <p className="font-medium text-slate-700">Body</p>
                  <pre className="mt-1 whitespace-pre-wrap font-sans text-slate-700 leading-relaxed">{draft.body}</pre>
                </div>
                <div>
                  <p className="font-medium text-slate-700">Angle</p>
                  <p className="mt-1 text-slate-600 italic">{draft.rationale}</p>
                </div>
                <p className="text-xs text-slate-400">
                  Generated {new Date(draft.generatedAt).toLocaleDateString("en-US", {
                    month: "short", day: "numeric", year: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })} via {draft.provider}
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-400">
                {research
                  ? "No draft yet — click \"Generate draft\" to create one from the research brief."
                  : "Research this lead first before generating a draft."}
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Notes</h2>

            <form action={noteAction} className="mb-6">
              <textarea
                name="body"
                rows={3}
                placeholder="Add an internal note…"
                className={INPUT_CLS}
              />
              <div className="mt-2 flex justify-end">
                <SubmitButton
                  pendingLabel="Saving…"
                  className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  Save note
                </SubmitButton>
              </div>
            </form>

            {lead.activities.length === 0 ? (
              <p className="text-sm text-slate-400">No notes yet.</p>
            ) : (
              <ul className="space-y-4">
                {lead.activities.map((note) => (
                  <li key={note.id} className="border-t border-slate-100 pt-4 first:border-t-0 first:pt-0">
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.body}</p>
                    <div className="mt-1 flex items-center justify-between gap-4">
                      <p className="text-xs text-slate-400">
                        {note.createdAt.toLocaleDateString("en-US", {
                          month:  "short",
                          day:    "numeric",
                          year:   "numeric",
                          hour:   "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      <form action={deleteNote.bind(null, lead.id, note.id)}>
                        <button
                          type="submit"
                          className="text-xs text-slate-400 hover:text-red-600"
                        >
                          Delete
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right: metadata */}
        <div>
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Details</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-slate-500">Archetype</dt>
                <dd className="mt-0.5 font-medium text-slate-900">{formatArchetype(lead.archetype)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Status</dt>
                <dd className="mt-0.5">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[lead.status]}`}>
                    {formatStatus(lead.status)}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-slate-500 mb-1">Playbook</dt>
                <dd>
                  <form action={updatePlaybookAction} className="flex items-center gap-2">
                    <select
                      key={lead.playbookId ?? "none"}
                      name="playbookId"
                      defaultValue={lead.playbookId ?? ""}
                      className="flex-1 min-w-0 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    >
                      <option value="">— none —</option>
                      {playbooks.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <SubmitButton
                      pendingLabel="…"
                      className="shrink-0 rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1 disabled:opacity-40"
                    >
                      Save
                    </SubmitButton>
                  </form>
                  {playbookConfig && (
                    <p className="mt-1.5 text-xs text-slate-500 leading-snug">
                      {playbookConfig.persona}
                    </p>
                  )}
                  {playbookConfig?.scoringNotes && (
                    <p className="mt-1 text-xs text-slate-400 leading-snug italic">
                      {playbookConfig.scoringNotes}
                    </p>
                  )}
                </dd>
              </div>
              {lead.searchProfile && (
                <div>
                  <dt className="text-slate-500">Source Profile</dt>
                  <dd className="mt-0.5">
                    <Link
                      href={`/search-profiles/${lead.searchProfile.id}`}
                      className="font-medium text-brand-600 hover:text-brand-700"
                    >
                      {lead.searchProfile.name}
                    </Link>
                  </dd>
                </div>
              )}
              {lead.assignedTo && (
                <div>
                  <dt className="text-slate-500">Assigned to</dt>
                  <dd className="mt-0.5 font-medium text-slate-900">
                    {lead.assignedTo.name ?? lead.assignedTo.email}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-slate-500">Created</dt>
                <dd className="mt-0.5 font-medium text-slate-900">
                  {lead.createdAt.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Last updated</dt>
                <dd className="mt-0.5 font-medium text-slate-900">
                  {lead.updatedAt.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
