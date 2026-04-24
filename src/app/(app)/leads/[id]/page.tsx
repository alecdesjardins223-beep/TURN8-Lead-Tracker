import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LeadStatus } from "@prisma/client";
import { formatArchetype, formatStatus } from "@/lib/utils";
import { updateLeadStatus, createNote, deleteNote, researchLead } from "./actions";
import type { ResearchBrief } from "@/lib/research";

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

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      assignedTo:    { select: { name: true, email: true } },
      playbook:      { select: { name: true } },
      searchProfile: { select: { id: true, name: true } },
      activities: {
        where:   { type: "NOTE" },
        orderBy: { createdAt: "desc" },
        select:  { id: true, body: true, createdAt: true },
      },
    },
  });

  if (!lead) notFound();

  const action          = updateLeadStatus.bind(null, lead.id);
  const noteAction      = createNote.bind(null, lead.id);
  const researchAction  = researchLead.bind(null, lead.id);

  const meta     = lead.metadata as Record<string, unknown>;
  const research = (meta?.research ?? null) as (ResearchBrief & { generatedAt: string; provider: string }) | null;

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
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Contact Info</h2>
            <dl className="space-y-3 text-sm">
              {lead.email && (
                <div className="flex gap-4">
                  <dt className="w-28 shrink-0 text-slate-500">Email</dt>
                  <dd className="text-slate-900">{lead.email}</dd>
                </div>
              )}
              {lead.phone && (
                <div className="flex gap-4">
                  <dt className="w-28 shrink-0 text-slate-500">Phone</dt>
                  <dd className="text-slate-900">{lead.phone}</dd>
                </div>
              )}
              {lead.linkedinUrl && (
                <div className="flex gap-4">
                  <dt className="w-28 shrink-0 text-slate-500">LinkedIn</dt>
                  <dd>
                    <a
                      href={lead.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-600 hover:text-brand-700 truncate block max-w-sm"
                    >
                      {lead.linkedinUrl}
                    </a>
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
              {!lead.email && !lead.phone && !lead.linkedinUrl && !lead.location && !lead.notes && (
                <p className="text-slate-400">No contact details available.</p>
              )}
            </dl>
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
              <button
                type="submit"
                className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
              >
                Save
              </button>
            </form>
          </div>
          {/* Research Brief */}
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-900">Research Brief</h2>
              <form action={researchAction}>
                <button
                  type="submit"
                  className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
                >
                  {research ? "Re-run research" : "Research this lead"}
                </button>
              </form>
            </div>

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
                  Generated {new Date(research.generatedAt).toLocaleDateString("en-US", {
                    month: "short", day: "numeric", year: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })} via {research.provider}
                </p>
              </dl>
            ) : (
              <p className="text-sm text-slate-400">
                No research brief yet — click "Research this lead" to generate one.
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
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <div className="mt-2 flex justify-end">
                <button
                  type="submit"
                  className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
                >
                  Save note
                </button>
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
              {lead.playbook && (
                <div>
                  <dt className="text-slate-500">Playbook</dt>
                  <dd className="mt-0.5 font-medium text-slate-900">{lead.playbook.name}</dd>
                </div>
              )}
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
