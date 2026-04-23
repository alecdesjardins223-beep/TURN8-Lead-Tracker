import type { Metadata } from "next";

export const metadata: Metadata = { title: "Playbooks" };

export default function PlaybooksPage() {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Playbooks</h1>
        <p className="page-subtitle">
          Outreach strategies organized by lead archetype
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-12 text-center">
        <p className="text-sm text-slate-400">
          Playbook management coming in Phase 2
        </p>
      </div>
    </div>
  );
}
