import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatArchetype, formatStatus } from "@/lib/utils";
import type { LeadStatus } from "@prisma/client";

export const metadata: Metadata = { title: "Leads" };

const STATUS_CLASSES: Record<LeadStatus, string> = {
  IDENTIFIED:     "bg-slate-100 text-slate-600",
  RESEARCHED:     "bg-blue-50 text-blue-700",
  OUTREACH_READY: "bg-indigo-50 text-indigo-700",
  CONTACTED:      "bg-amber-50 text-amber-700",
  ENGAGED:        "bg-green-50 text-green-700",
  CONVERTED:      "bg-emerald-50 text-emerald-700",
  ARCHIVED:       "bg-slate-100 text-slate-400",
};

const TABLE_HEADERS = [
  "Person / Company",
  "Archetype",
  "Status",
  "Playbook",
  "Source Profile",
  "Updated",
] as const;

export default async function LeadsPage() {
  const leads = await prisma.lead.findMany({
    include: {
      assignedTo:    { select: { name: true, email: true } },
      playbook:      { select: { name: true } },
      searchProfile: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Leads</h1>
        <p className="page-subtitle">All prospects across playbooks and archetypes</p>
      </div>

      {leads.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-12 text-center">
          <p className="text-sm font-medium text-slate-700">No leads yet</p>
          <p className="mt-1 text-sm text-slate-400">
            Leads will appear here after running discovery on a search profile.
          </p>
          <Link
            href="/search-profiles"
            className="mt-4 inline-block text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            Go to Search Profiles →
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                {TABLE_HEADERS.map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-slate-900">
                      {lead.firstName} {lead.lastName}
                    </p>
                    {(lead.title || lead.company) && (
                      <p className="mt-0.5 text-xs text-slate-400">
                        {[lead.title, lead.company].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {formatArchetype(lead.archetype)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[lead.status]}`}
                    >
                      {formatStatus(lead.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {lead.playbook?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {lead.searchProfile ? (
                      <Link
                        href={`/search-profiles/${lead.searchProfile.id}`}
                        className="text-brand-600 hover:text-brand-700"
                      >
                        {lead.searchProfile.name}
                      </Link>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {lead.updatedAt.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
