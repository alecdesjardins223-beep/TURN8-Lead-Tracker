import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { LeadStatus } from "@prisma/client";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const [totalLeads, qualifiedLeads, highPriorityLeads, draftsReady] =
    await Promise.all([
      prisma.lead.count(),
      // RESEARCHED = first status past auto-discovery; closest proxy for "qualified"
      prisma.lead.count({ where: { status: LeadStatus.RESEARCHED } }),
      // No priority field in schema; CONTACTED+ENGAGED are the actively-pursued leads
      prisma.lead.count({
        where: { status: { in: [LeadStatus.CONTACTED, LeadStatus.ENGAGED] } },
      }),
      prisma.lead.count({ where: { status: LeadStatus.OUTREACH_READY } }),
    ]);

  const stats = [
    { label: "Total Discovered", value: totalLeads },
    { label: "Qualified", value: qualifiedLeads },
    { label: "High Priority", value: highPriorityLeads },
    { label: "Drafts Ready", value: draftsReady },
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
