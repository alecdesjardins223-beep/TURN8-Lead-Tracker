"use server";

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LeadArchetype } from "@prisma/client";

function parseList(raw: FormDataEntryValue | null): string[] {
  if (!raw || typeof raw !== "string") return [];
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

export async function createSearchProfile(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error("Unauthorized");

  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || undefined;
  const archetype = formData.get("archetype") as LeadArchetype;
  const playbookId = (formData.get("playbookId") as string) || undefined;

  if (!name) throw new Error("Name is required");
  if (!archetype || !Object.values(LeadArchetype).includes(archetype)) {
    throw new Error("A valid archetype is required");
  }

  const filters = {
    geography: parseList(formData.get("geography")),
    industries: parseList(formData.get("industries")),
    titles: parseList(formData.get("titles")),
    fundingStage: parseList(formData.get("fundingStage")),
    keywords: parseList(formData.get("keywords")),
  };

  const profile = await prisma.searchProfile.create({
    data: {
      name,
      description,
      archetype,
      filters,
      playbookId,
      createdById: session.user.id,
    },
  });

  redirect(`/search-profiles/${profile.id}`);
}
