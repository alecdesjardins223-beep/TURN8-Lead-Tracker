import type { Metadata } from "next";

export const metadata: Metadata = { title: "Search Profiles" };

export default function SearchProfilesPage() {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Search Profiles</h1>
        <p className="page-subtitle">
          Saved segment configurations used to source and filter leads
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-12 text-center">
        <p className="text-sm text-slate-400">
          Search profile builder coming in Phase 2
        </p>
      </div>
    </div>
  );
}
