"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDiscoveryProvider } from "@/lib/discovery";
import { LeadArchetype } from "@prisma/client";
import type { SearchFilters } from "@/types";
import type { LeadCandidate } from "@/lib/discovery/types";

export type DiscoveryActionResult =
  | { ok: true;  leadsCreated: number; leadsSkipped: number; candidatesFound: number; runId: string }
  | { ok: false; error: string };

// Stable dedup key: lower-cased "firstname|lastname|company"
function dedupKey(firstName: string, lastName: string, company?: string | null): string {
  return `${firstName.toLowerCase()}|${lastName.toLowerCase()}|${(company ?? "").toLowerCase()}`;
}

export async function runDiscovery(profileId: string): Promise<DiscoveryActionResult> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { ok: false, error: "Unauthorized" };

  // Load profile
  const profile = await prisma.searchProfile.findUnique({ where: { id: profileId } });
  if (!profile) return { ok: false, error: "Search profile not found" };

  // Resolve provider before creating the run so we can record its name
  const provider = getDiscoveryProvider();

  const run = await prisma.workflowRun.create({
    data: {
      type:            "DISCOVERY",
      status:          "RUNNING",
      searchProfileId: profileId,
      inputPayload:    {
        filters:   profile.filters,
        archetype: profile.archetype,
        provider:  provider.name,
      },
    },
  });

  try {
    const result = await provider.discover({
      name:      profile.name,
      archetype: profile.archetype,
      filters:   profile.filters as SearchFilters,
    });

    // Build dedup sets from existing leads on this profile
    const existing = await prisma.lead.findMany({
      where: { searchProfileId: profileId },
      select: { email: true, firstName: true, lastName: true, company: true },
    });

    const existingEmails = new Set(existing.map((l) => l.email?.toLowerCase()).filter(Boolean) as string[]);
    const existingKeys   = new Set(existing.map((l) => dedupKey(l.firstName, l.lastName, l.company)));

    let leadsCreated = 0;
    let leadsSkipped = 0;
    const parsedOutput: LeadCandidate[] = [];

    for (const candidate of result.candidates) {
      const emailKey = candidate.email?.toLowerCase();
      const nameKey  = dedupKey(candidate.firstName, candidate.lastName, candidate.company);

      const isDuplicate =
        (emailKey && existingEmails.has(emailKey)) ||
        existingKeys.has(nameKey);

      if (isDuplicate) {
        leadsSkipped++;
        continue;
      }

      await prisma.lead.create({
        data: {
          firstName:       candidate.firstName,
          lastName:        candidate.lastName,
          email:           candidate.email ?? undefined,
          title:           candidate.title ?? undefined,
          company:         candidate.company ?? undefined,
          location:        candidate.location ?? undefined,
          linkedinUrl:     candidate.linkedinUrl ?? undefined,
          archetype:       profile.archetype as LeadArchetype,
          status:          "IDENTIFIED",
          searchProfileId: profileId,
          playbookId:      profile.playbookId ?? undefined,
          metadata: candidate.source ? { source: candidate.source } : {},
        },
      });

      // Track for dedup within this batch
      existingKeys.add(nameKey);
      if (emailKey) existingEmails.add(emailKey);

      parsedOutput.push(candidate);
      leadsCreated++;
    }

    await prisma.workflowRun.update({
      where: { id: run.id },
      data: {
        status:          "COMPLETED",
        candidatesFound: result.candidates.length,
        leadsCreated,
        leadsSkipped,
        rawOutput:       result.rawOutput as object,
        parsedOutput:    parsedOutput as unknown as object,
        completedAt:     new Date(),
      },
    });

    revalidatePath(`/search-profiles/${profileId}`);
    revalidatePath("/leads");

    return { ok: true, leadsCreated, leadsSkipped, candidatesFound: result.candidates.length, runId: run.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await prisma.workflowRun.update({
      where: { id: run.id },
      data: { status: "FAILED", errorMessage: message, completedAt: new Date() },
    });
    return { ok: false, error: message };
  }
}
