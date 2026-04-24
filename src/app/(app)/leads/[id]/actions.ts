"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LeadStatus } from "@prisma/client";

const VALID_STATUSES = new Set(Object.values(LeadStatus));

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
