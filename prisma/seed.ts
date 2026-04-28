import { PrismaClient, UserRole, LeadArchetype, LeadStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const admin = await prisma.user.upsert({
    where: { email: "admin@turn8.io" },
    update: {},
    create: {
      name: "TURN8 Admin",
      email: "admin@turn8.io",
      role: UserRole.ADMIN,
    },
  });

  // Keep the real operator account at ADMIN so re-seeding doesn't downgrade it
  await prisma.user.upsert({
    where: { email: "alec.desjardins@turn8wealth.com" },
    update: { role: UserRole.ADMIN },
    create: {
      name: "Alec Desjardins",
      email: "alec.desjardins@turn8wealth.com",
      role: UserRole.ADMIN,
    },
  });

  // ── Playbooks ──────────────────────────────────────────────────────────────
  // Four canonical segments. IDs are stable slugs used as config map keys.

  const bOwners = await prisma.playbook.upsert({
    where: { id: "playbook-business-owners" },
    update: { name: "Business Owners", isActive: true },
    create: {
      id:          "playbook-business-owners",
      name:        "Business Owners",
      description: "Owner-operators of profitable private businesses with embedded equity.",
      archetype:   LeadArchetype.FOUNDER,
      ownerId:     admin.id,
    },
  });

  await prisma.playbook.upsert({
    where: { id: "playbook-senior-executives" },
    update: { name: "Senior Executives", isActive: true },
    create: {
      id:          "playbook-senior-executives",
      name:        "Senior Executives",
      description: "C-suite and VP-level leaders at public or well-funded private companies.",
      archetype:   LeadArchetype.EXECUTIVE,
      ownerId:     admin.id,
    },
  });

  await prisma.playbook.upsert({
    where: { id: "playbook-board-philanthropy" },
    update: { name: "Board Members & Philanthropists", isActive: true },
    create: {
      id:          "playbook-board-philanthropy",
      name:        "Board Members & Philanthropists",
      description: "Board directors and foundation participants with active philanthropic programmes.",
      archetype:   LeadArchetype.BOARD_MEMBER,
      ownerId:     admin.id,
    },
  });

  await prisma.playbook.upsert({
    where: { id: "playbook-incorporated-professionals" },
    update: { name: "Incorporated Professionals", isActive: true },
    create: {
      id:          "playbook-incorporated-professionals",
      name:        "Incorporated Professionals",
      description: "High-income licensed professionals operating through a professional corporation.",
      archetype:   LeadArchetype.INCORPORATED_PROFESSIONAL,
      ownerId:     admin.id,
    },
  });

  // Keep legacy founder playbook so existing leads referencing it aren't orphaned
  await prisma.playbook.upsert({
    where: { id: "seed-playbook-founders" },
    update: {},
    create: {
      id:          "seed-playbook-founders",
      name:        "Founders",
      description: "Early-stage and growth-stage startup founders.",
      archetype:   LeadArchetype.FOUNDER,
      ownerId:     admin.id,
    },
  });

  // ── Search Profile ─────────────────────────────────────────────────────────

  const searchProfile = await prisma.searchProfile.upsert({
    where: { id: "seed-sp-founders-nyc" },
    update: {},
    create: {
      id:          "seed-sp-founders-nyc",
      name:        "NYC Founders – Seed Stage",
      archetype:   LeadArchetype.FOUNDER,
      filters: {
        geography:    ["New York", "Brooklyn", "Manhattan"],
        fundingStage: ["pre-seed", "seed"],
        industries:   ["fintech", "proptech", "climate"],
      },
      createdById: admin.id,
      playbookId:  bOwners.id,
    },
  });

  // ── Seed Leads (upsert so playbookId is updated on re-seed) ───────────────

  await prisma.lead.upsert({
    where:  { id: "seed-lead-1" },
    update: { playbookId: bOwners.id },
    create: {
      id:             "seed-lead-1",
      firstName:      "Alex",
      lastName:       "Rivera",
      email:          "alex@example.com",
      title:          "Co-Founder & CEO",
      company:        "Example Ventures",
      location:       "New York, NY",
      archetype:      LeadArchetype.FOUNDER,
      status:         LeadStatus.IDENTIFIED,
      assignedToId:   admin.id,
      playbookId:     bOwners.id,
      searchProfileId: searchProfile.id,
    },
  });

  await prisma.lead.upsert({
    where:  { id: "seed-lead-2" },
    update: { playbookId: bOwners.id },
    create: {
      id:             "seed-lead-2",
      firstName:      "Jordan",
      lastName:       "Chen",
      email:          "jordan@example.io",
      title:          "Founder",
      company:        "Prototype Labs",
      location:       "Brooklyn, NY",
      archetype:      LeadArchetype.FOUNDER,
      status:         LeadStatus.RESEARCHED,
      assignedToId:   admin.id,
      playbookId:     bOwners.id,
      searchProfileId: searchProfile.id,
    },
  });

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
