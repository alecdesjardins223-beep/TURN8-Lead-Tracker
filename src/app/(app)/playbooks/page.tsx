import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatArchetype } from "@/lib/utils";
import type { LeadArchetype } from "@prisma/client";
import { getPlaybookConfig } from "@/lib/playbooks";

export const metadata: Metadata = { title: "Playbooks" };

const ARCHETYPE_CLS: Partial<Record<LeadArchetype, string>> & { _default: string } = {
  FOUNDER:                   "bg-brand-50 text-brand-700",
  EXECUTIVE:                 "bg-blue-50 text-blue-700",
  BOARD_MEMBER:              "bg-purple-50 text-purple-700",
  INCORPORATED_PROFESSIONAL: "bg-indigo-50 text-indigo-700",
  _default:                  "bg-slate-100 text-slate-600",
};

function archetypeCls(a: LeadArchetype): string {
  return ARCHETYPE_CLS[a] ?? ARCHETYPE_CLS._default;
}

export default async function PlaybooksPage() {
  const playbooks = await prisma.playbook.findMany({
    where:   { isActive: true },
    orderBy: { name: "asc" },
    include: {
      searchProfiles: {
        where:  { isActive: true },
        select: { id: true, name: true },
      },
      _count: {
        select: { leads: true },
      },
    },
  });

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Playbooks</h1>
        <p className="page-subtitle">
          {playbooks.length} active outreach strateg{playbooks.length === 1 ? "y" : "ies"}
        </p>
      </div>

      {playbooks.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-12 text-center">
          <p className="text-sm text-slate-400">No active playbooks found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {playbooks.map((pb) => {
            const config       = getPlaybookConfig(pb.id);
            const persona      = config?.persona ?? pb.description;
            const scoringNotes = config?.scoringNotes;
            const leadCount    = pb._count.leads;

            return (
              <div
                key={pb.id}
                className="rounded-lg border border-slate-200 bg-white p-5"
              >
                {/* Name + archetype + lead count */}
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm font-semibold text-slate-900">
                      {pb.name}
                    </h2>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${archetypeCls(pb.archetype)}`}>
                      {formatArchetype(pb.archetype)}
                    </span>
                  </div>
                  <Link
                    href="/leads"
                    className="shrink-0 text-xs text-slate-400 hover:text-slate-600"
                    title="View all leads"
                  >
                    {leadCount} lead{leadCount !== 1 ? "s" : ""}
                  </Link>
                </div>

                {/* Persona */}
                {persona && (
                  <p className="text-xs text-slate-600 leading-relaxed mb-3">
                    {persona}
                  </p>
                )}

                {/* Scoring notes */}
                {scoringNotes && (
                  <p className="mb-3 text-xs text-slate-400 italic leading-relaxed">
                    Scoring: {scoringNotes}
                  </p>
                )}

                {/* Search profiles footer */}
                <div className="flex items-center gap-2 pt-3 border-t border-slate-100 flex-wrap">
                  <span className="text-xs text-slate-400 shrink-0">Search profiles:</span>
                  {pb.searchProfiles.length === 0 ? (
                    <span className="text-xs text-slate-300">none linked</span>
                  ) : (
                    pb.searchProfiles.map((sp) => (
                      <Link
                        key={sp.id}
                        href={`/search-profiles/${sp.id}`}
                        className="text-xs font-medium text-brand-600 hover:text-brand-700"
                      >
                        {sp.name}
                      </Link>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
