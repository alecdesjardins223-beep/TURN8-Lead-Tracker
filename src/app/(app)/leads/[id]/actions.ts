"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LeadStatus } from "@prisma/client";
import { getResearchProvider } from "@/lib/research";

const VALID_STATUSES = new Set(Object.values(LeadStatus));

export async function researchLead(leadId: string, _formData: FormData): Promise<void> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return;

  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) return;

  const provider = getResearchProvider();
  const brief = await provider.research({
    firstName:   lead.firstName,
    lastName:    lead.lastName,
    title:       lead.title,
    company:     lead.company,
    location:    lead.location,
    linkedinUrl: lead.linkedinUrl,
    archetype:   lead.archetype,
  });

  const existingMeta = (lead.metadata as Record<string, unknown>) ?? {};
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      metadata: {
        ...existingMeta,
        research: {
          generatedAt: new Date().toISOString(),
          provider:    provider.name,
          ...brief,
        },
      },
    },
  });

  revalidatePath(`/leads/${leadId}`);
}

export async function deleteNote(leadId: string, noteId: string): Promise<void> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return;

  // Verify the activity exists, belongs to the expected lead, and is a NOTE
  const activity = await prisma.leadActivity.findUnique({ where: { id: noteId } });
  if (!activity || activity.leadId !== leadId || activity.type !== "NOTE") return;

  await prisma.leadActivity.delete({ where: { id: noteId } });

  revalidatePath(`/leads/${leadId}`);
}

export async function createNote(leadId: string, formData: FormData): Promise<void> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return;

  const body = formData.get("body");
  if (typeof body !== "string" || body.trim() === "") return;

  await prisma.leadActivity.create({
    data: { leadId, type: "NOTE", body: body.trim() },
  });

  revalidatePath(`/leads/${leadId}`);
}

export async function updateLeadStatus(
  leadId: string,
  formData: FormData,
): Promise<void> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return;

  const raw = formData.get("status");
  if (typeof raw !== "string" || !VALID_STATUSES.has(raw as LeadStatus)) return;

  await prisma.lead.update({
    where: { id: leadId },
    data: { status: raw as LeadStatus },
  });

  revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
  revalidatePath("/dashboard");
}
