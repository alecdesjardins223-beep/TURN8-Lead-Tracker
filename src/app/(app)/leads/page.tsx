import type { Metadata } from "next";

export const metadata: Metadata = { title: "Leads" };

export default function LeadsPage() {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Leads</h1>
        <p className="page-subtitle">
          All prospects across playbooks and archetypes
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-12 text-center">
        <p className="text-sm text-slate-400">
          Lead table and filters coming in Phase 2
        </p>
      </div>
    </div>
  );
}
