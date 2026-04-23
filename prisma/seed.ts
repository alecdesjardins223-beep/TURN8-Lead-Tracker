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

  const playbook = await prisma.playbook.upsert({
    where: { id: "seed-playbook-founders" },
    update: {},
    create: {
      id: "seed-playbook-founders",
      name: "Founder Outreach",
      description: "Standard outreach sequence for early-stage founders",
      archetype: LeadArchetype.FOUNDER,
      ownerId: admin.id,
    },
  });

  const searchProfile = await prisma.searchProfile.upsert({
    where: { id: "seed-sp-founders-nyc" },
    update: {},
    create: {
      id: "seed-sp-founders-nyc",
      name: "NYC Founders – Seed Stage",
      archetype: LeadArchetype.FOUNDER,
      filters: {
        geography: ["New York", "Brooklyn", "Manhattan"],
        fundingStage: ["pre-seed", "seed"],
        industries: ["fintech", "proptech", "climate"],
      },
      createdById: admin.id,
      playbookId: playbook.id,
    },
  });

  await prisma.lead.createMany({
    skipDuplicates: true,
    data: [
      {
        id: "seed-lead-1",
        firstName: "Alex",
        lastName: "Rivera",
        email: "alex@example.com",
        title: "Co-Founder & CEO",
        company: "Example Ventures",
        location: "New York, NY",
        archetype: LeadArchetype.FOUNDER,
        status: LeadStatus.IDENTIFIED,
        assignedToId: admin.id,
        playbookId: playbook.id,
        searchProfileId: searchProfile.id,
      },
      {
        id: "seed-lead-2",
        firstName: "Jordan",
        lastName: "Chen",
        email: "jordan@example.io",
        title: "Founder",
        company: "Prototype Labs",
        location: "Brooklyn, NY",
        archetype: LeadArchetype.FOUNDER,
        status: LeadStatus.RESEARCHED,
        assignedToId: admin.id,
        playbookId: playbook.id,
        searchProfileId: searchProfile.id,
      },
    ],
  });

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
