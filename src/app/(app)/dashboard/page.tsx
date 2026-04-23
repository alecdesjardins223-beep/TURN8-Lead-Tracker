import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { LeadStatus } from "@prisma/client";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const [totalLeads, activePlaybooks, searchProfiles, outreachReady] =
    await Promise.all([
      prisma.lead.count(),
      prisma.playbook.count({ where: { isActive: true } }),
      prisma.searchProfile.count({ where: { isActive: true } }),
      prisma.lead.count({ where: { status: LeadStatus.OUTREACH_READY } }),
    ]);

  const stats = [
    { label: "Total Leads", value: totalLeads },
    { label: "Active Playbooks", value: activePlaybooks },
    { label: "Search Profiles", value: searchProfiles },
    { label: "Outreach Ready", value: outreachReady },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Overview of pipeline activity and lead status</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value }) => (
          <div
            key={label}
            className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
          >
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
