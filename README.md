# TURN8 Lead Tracker

Internal lead intelligence and outreach management system. Supports multiple prospect archetypes across configurable playbooks.

## Stack

- **Next.js 15** (App Router, TypeScript)
- **Tailwind CSS**
- **Prisma** with PostgreSQL
- **NextAuth v4** (magic-link email auth)
- **Zod** for validation

## Local Setup

### Prerequisites

- Node.js 20+
- PostgreSQL running locally (or a connection string to a remote instance)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_URL` | `http://localhost:3000` for local dev |
| `NEXTAUTH_SECRET` | Random 32-byte secret (`openssl rand -base64 32`) |
| `EMAIL_SERVER` | SMTP connection string for magic-link emails |
| `EMAIL_FROM` | Sender address shown in auth emails |

### 3. Create the database

Create a local Postgres database named `turn8_dev` (or match your `DATABASE_URL`):

```bash
createdb turn8_dev
```

### 4. Run migrations

```bash
npm run db:migrate
```

This applies the Prisma schema and generates the Prisma client.

### 5. Seed initial data

```bash
npm run db:seed
```

Inserts a default admin user, one starter playbook, one search profile, and two sample leads.

### 6. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You'll be redirected to `/login`.

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run db:migrate` | Apply Prisma migrations |
| `npm run db:generate` | Regenerate Prisma client after schema changes |
| `npm run db:studio` | Open Prisma Studio (visual DB browser) |
| `npm run db:seed` | Run the seed script |

---

## Routes

| Route | Description |
|---|---|
| `/login` | Magic-link sign-in |
| `/dashboard` | Pipeline overview |
| `/playbooks` | Outreach playbooks by archetype |
| `/search-profiles` | Saved segment/search configurations |
| `/leads` | All lead records |
| `/settings` | User and app settings |

---

## Lead Archetypes

The schema is built to support multiple prospect types without hardcoding assumptions:

- `FOUNDER`
- `EXECUTIVE`
- `BOARD_MEMBER`
- `DONOR`
- `FOUNDATION_PARTICIPANT`
- `FAMILY_OFFICE_PROFESSIONAL`
- `INCORPORATED_PROFESSIONAL`
- `OTHER`

Archetype-specific fields are stored in the flexible `metadata` JSON column on `Lead`.

---

## Roadmap

- **Phase 2**: Lead table, playbook CRUD, search profile builder, role-based access enforcement
- **Phase 3**: Perplexity-powered lead enrichment, Resend email sequences
