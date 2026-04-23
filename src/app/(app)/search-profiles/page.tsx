import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatArchetype } from "@/lib/utils";
import type { SearchFilters } from "@/types";

export const metadata: Metadata = { title: "Search Profiles" };

export default async function SearchProfilesPage() {
  const profiles = await prisma.searchProfile.findMany({
    include: {
      createdBy: { select: { name: true, email: true } },
      playbook: { select: { name: true } },
      _count: { select: { leads: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="page-container">
      <div className="page-header flex items-start justify-between">
        <div>
          <h1 className="page-title">Search Profiles</h1>
          <p className="page-subtitle">
            Saved segment configurations used to source and filter leads
          </p>
        </div>
        <Link
          href="/search-profiles/new"
          className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
        >
          New Search Profile
        </Link>
      </div>

      {profiles.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-12 text-center">
          <p className="text-sm font-medium text-slate-700">No search profiles yet</p>
          <p className="mt-1 text-sm text-slate-400">
            Create your first profile to start sourcing leads.
          </p>
          <Link
            href="/search-profiles/new"
            className="mt-4 inline-block rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
          >
            New Search Profile
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {profiles.map((profile) => {
            const filters = profile.filters as SearchFilters;
            return (
              <Link
                key={profile.id}
                href={`/search-profiles/${profile.id}`}
                className="block rounded-lg border border-slate-200 bg-white p-5 shadow-sm hover:border-brand-500 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-slate-900">{profile.name}</span>
                      <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                        {formatArchetype(profile.archetype)}
                      </span>
                      {!profile.isActive && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                          Inactive
                        </span>
                      )}
                    </div>
                    {profile.description && (
                      <p className="mt-1 text-sm text-slate-500 truncate">{profile.description}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                      {filters.geography?.length ? (
                        <span>Geography: {filters.geography.join(", ")}</span>
                      ) : null}
                      {filters.industries?.length ? (
                        <span>Industries: {filters.industries.join(", ")}</span>
                      ) : null}
                      {filters.titles?.length ? (
                        <span>Titles: {filters.titles.join(", ")}</span>
                      ) : null}
                      {profile.playbook && (
                        <span>Playbook: {profile.playbook.name}</span>
                      )}
                    </div>
                  </div>
                  <div className="ml-4 text-right shrink-0">
                    <p className="text-sm font-semibold text-slate-900">{profile._count.leads}</p>
                    <p className="text-xs text-slate-400">leads</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
