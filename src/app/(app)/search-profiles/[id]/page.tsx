import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatArchetype, formatStatus } from "@/lib/utils";
import { RunDiscoveryButton } from "./RunDiscoveryButton";
import type { SearchFilters } from "@/types";
import type { LeadStatus, WorkflowRunStatus } from "@prisma/client";

export const metadata: Metadata = { title: "Search Profile" };

const STATUS_CLASSES: Record<LeadStatus, string> = {
  IDENTIFIED:     "bg-slate-100 text-slate-600",
  RESEARCHED:     "bg-blue-50 text-blue-700",
  OUTREACH_READY: "bg-indigo-50 text-indigo-700",
  CONTACTED:      "bg-amber-50 text-amber-700",
  ENGAGED:        "bg-green-50 text-green-700",
  CONVERTED:      "bg-emerald-50 text-emerald-700",
  ARCHIVED:       "bg-slate-100 text-slate-400",
};

const RUN_STATUS_CLASSES: Record<WorkflowRunStatus, string> = {
  RUNNING:   "bg-amber-50 text-amber-700",
  COMPLETED: "bg-green-50 text-green-700",
  FAILED:    "bg-red-50 text-red-700",
};

const FILTER_LABELS: { key: keyof SearchFilters; label: string }[] = [
  { key: "geography",    label: "Geography" },
  { key: "industries",   label: "Industries" },
  { key: "titles",       label: "Target Titles" },
  { key: "fundingStage", label: "Funding Stage" },
  { key: "keywords",     label: "Keywords / Signals" },
];

export default async function SearchProfileDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const profile = await prisma.searchProfile.findUnique({
    where: { id },
    include: {
      createdBy: { select: { name: true, email: true } },
      playbook:  { select: { id: true, name: true } },
      leads: {
        orderBy: { updatedAt: "desc" },
        take: 20,
        select: {
          id: true, firstName: true, lastName: true,
          title: true, company: true, status: true,
        },
      },
      workflowRuns: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true, status: true, candidatesFound: true,
          leadsCreated: true, leadsSkipped: true,
          errorMessage: true, createdAt: true, completedAt: true,
          inputPayload: true,
        },
      },
      _count: { select: { leads: true } },
    },
  });

  if (!profile) notFound();

  const filters = profile.filters as SearchFilters;
  const activeFilters = FILTER_LABELS.filter(
    ({ key }) => Array.isArray(filters[key]) && (filters[key] as string[]).length > 0
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <nav className="flex items-center gap-1.5 text-sm text-slate-500 mb-2">
          <Link href="/search-profiles" className="hover:text-slate-900">
            Search Profiles
          </Link>
          <span>/</span>
          <span className="truncate max-w-xs text-slate-700">{profile.name}</span>
        </nav>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="page-title">{profile.name}</h1>
              <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                {formatArchetype(profile.archetype)}
              </span>
              {!profile.isActive && (
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-500">
                  Inactive
                </span>
              )}
            </div>
            {profile.description && (
              <p className="page-subtitle">{profile.description}</p>
            )}
          </div>
          <RunDiscoveryButton profileId={id} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left: filters + leads + run history */}
        <div className="lg:col-span-2 space-y-6">

          {/* Filters */}
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Filters</h2>
            {activeFilters.length === 0 ? (
              <p className="text-sm text-slate-400">No filters configured.</p>
            ) : (
              <dl className="space-y-3">
                {activeFilters.map(({ key, label }) => (
                  <div key={key} className="flex gap-4">
                    <dt className="w-36 shrink-0 text-sm text-slate-500">{label}</dt>
                    <dd className="flex flex-wrap gap-1">
                      {(filters[key] as string[]).map((v) => (
                        <span
                          key={v}
                          className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-700"
                        >
                          {v}
                        </span>
                      ))}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          {/* Leads */}
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-900">
                Leads{" "}
                <span className="font-normal text-slate-400">({profile._count.leads})</span>
              </h2>
              {profile._count.leads > 20 && (
                <Link href="/leads" className="text-xs text-brand-600 hover:text-brand-700">
                  View all →
                </Link>
              )}
            </div>
            {profile.leads.length === 0 ? (
              <p className="text-sm text-slate-400">
                No leads yet — click Run Discovery to source candidates.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {profile.leads.map((lead) => (
                  <li key={lead.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {lead.firstName} {lead.lastName}
                      </p>
                      {(lead.title || lead.company) && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          {[lead.title, lead.company].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[lead.status]}`}>
                      {formatStatus(lead.status)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Discovery run history */}
          {profile.workflowRuns.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <h2 className="text-sm font-semibold text-slate-900 mb-4">Discovery Runs</h2>
              <ul className="divide-y divide-slate-100">
                {profile.workflowRuns.map((run) => {
                  const providerName =
                    (run.inputPayload as Record<string, unknown> | null)?.provider as string | undefined;
                  return (
                    <li key={run.id} className="flex items-start justify-between py-3 gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${RUN_STATUS_CLASSES[run.status]}`}>
                            {run.status}
                          </span>
                          {providerName && (
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-500">
                              {providerName}
                            </span>
                          )}
                          {run.status === "COMPLETED" && (
                            <span className="text-xs text-slate-500">
                              {run.candidatesFound} found · {run.leadsCreated} created · {run.leadsSkipped} skipped
                            </span>
                          )}
                          {run.status === "FAILED" && run.errorMessage && (
                            <span className="text-xs text-red-600 truncate max-w-sm">{run.errorMessage}</span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 shrink-0">
                        {run.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Right: metadata */}
        <div>
          <div className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Details</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-slate-500">Archetype</dt>
                <dd className="mt-0.5 font-medium text-slate-900">{formatArchetype(profile.archetype)}</dd>
              </div>
              {profile.playbook && (
                <div>
                  <dt className="text-slate-500">Playbook</dt>
                  <dd className="mt-0.5 font-medium text-brand-600">{profile.playbook.name}</dd>
                </div>
              )}
              <div>
                <dt className="text-slate-500">Created by</dt>
                <dd className="mt-0.5 font-medium text-slate-900">
                  {profile.createdBy.name ?? profile.createdBy.email}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Created</dt>
                <dd className="mt-0.5 font-medium text-slate-900">
                  {profile.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Lead count</dt>
                <dd className="mt-0.5 font-medium text-slate-900">{profile._count.leads}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Discovery runs</dt>
                <dd className="mt-0.5 font-medium text-slate-900">{profile.workflowRuns.length > 0 ? "↑ see history" : "None yet"}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
