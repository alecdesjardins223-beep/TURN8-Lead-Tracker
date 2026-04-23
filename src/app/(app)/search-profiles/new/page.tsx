import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { LeadArchetype } from "@prisma/client";
import { formatArchetype } from "@/lib/utils";
import { createSearchProfile } from "./actions";

export const metadata: Metadata = { title: "New Search Profile" };

const FILTER_FIELDS = [
  { id: "geography",   label: "Geography",              placeholder: "New York, Brooklyn, Manhattan" },
  { id: "industries",  label: "Industries",             placeholder: "fintech, proptech, climate" },
  { id: "titles",      label: "Target Titles (Persona)", placeholder: "Founder, CEO, Managing Director" },
  { id: "fundingStage",label: "Funding Stage",          placeholder: "pre-seed, seed, Series A" },
  { id: "keywords",    label: "Keywords / Signals",     placeholder: "board advisory, family office, endowment" },
] as const;

export default async function NewSearchProfilePage() {
  const playbooks = await prisma.playbook.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="flex items-center gap-1.5 text-sm text-slate-500 mb-2">
          <Link href="/search-profiles" className="hover:text-slate-900">
            Search Profiles
          </Link>
          <span>/</span>
          <span>New</span>
        </div>
        <h1 className="page-title">New Search Profile</h1>
        <p className="page-subtitle">Define a segment to source and filter leads</p>
      </div>

      <form action={createSearchProfile} className="max-w-2xl space-y-6">
        {/* Basic info */}
        <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-900">Profile Details</h2>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              autoFocus
              className="mt-1.5 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              placeholder="e.g. NYC Founders – Seed Stage"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-700">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={2}
              className="mt-1.5 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              placeholder="Optional notes about this segment"
            />
          </div>

          <div>
            <label htmlFor="archetype" className="block text-sm font-medium text-slate-700">
              Lead Archetype <span className="text-red-500">*</span>
            </label>
            <select
              id="archetype"
              name="archetype"
              required
              defaultValue=""
              className="mt-1.5 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            >
              <option value="" disabled>Select archetype…</option>
              {Object.values(LeadArchetype).map((a) => (
                <option key={a} value={a}>
                  {formatArchetype(a)}
                </option>
              ))}
            </select>
          </div>

          {playbooks.length > 0 && (
            <div>
              <label htmlFor="playbookId" className="block text-sm font-medium text-slate-700">
                Link to Playbook
              </label>
              <select
                id="playbookId"
                name="playbookId"
                defaultValue=""
                className="mt-1.5 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="">None</option>
                {playbooks.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Filters</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Comma-separated values for each filter
            </p>
          </div>

          {FILTER_FIELDS.map(({ id, label, placeholder }) => (
            <div key={id}>
              <label htmlFor={id} className="block text-sm font-medium text-slate-700">
                {label}
              </label>
              <input
                id={id}
                name={id}
                type="text"
                className="mt-1.5 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                placeholder={placeholder}
              />
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            className="rounded-md bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
          >
            Create Search Profile
          </button>
          <Link href="/search-profiles" className="text-sm text-slate-500 hover:text-slate-900">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
