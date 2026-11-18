# AI Rankers SEO Portal

AI Rankers is a Next.js client portal and agency operations workspace for SEO reporting, local visibility, client communication, goals, and delivery operations.

The repository is a pnpm workspace with a PostgreSQL/Neon database layer and Neon Auth integration.

## Product surfaces

### Client portal

- `/portal` — client overview and performance summary
- `/portal/website-seo` — organic visibility reporting
- `/portal/gbp` — Google Business Profile presentation
- `/portal/activities` — client-safe work history and tasks
- `/portal/reports` — report library and report detail
- `/portal/messages` — client communication surface

### Agency/admin workspace

- `/admin` — workspace overview and client list
- `/admin/clients` — client management
- `/admin/clients/[id]` — client workspace settings, goals, members, and invitations
- `/admin/users` — role and access management
- `/admin/activities` — agency activity operations
- `/admin/goals` — goal operations
- `/admin/reports` — report operations
- `/admin/integrations` — provider readiness boundary
- `/admin/sync-health` — synchronization readiness boundary
- `/admin/audit` — audit activity

### Authentication

- `/client/login` — client sign-in
- `/admin/login` — agency/admin sign-in
- `/auth/sign-up` — client account creation
- `/auth/reset-password` — password recovery/reset surface
- `/accept-invite` and `/invite/[token]` — client invitation flow
- `/onboarding` — first-time client workspace setup

## Repository structure

| Path | Responsibility |
| --- | --- |
| `app/` | Next.js routes, API handlers, layouts, portal, admin, and auth screens |
| `components/` | Shared UI, report, dashboard, auth, activity, goal, and admin components |
| `lib/` | Server-side access control, tasks, reporting, and application helpers |
| `packages/core/` | Typed demo domain data and metric helpers |
| `packages/db/` | Prisma client and Neon PostgreSQL adapter |
| `packages/integrations/` | Reserved provider adapter boundary |
| `packages/ui/` | Reserved shared UI package boundary |
| `apps/web/` | Reserved future web app boundary; not the current Vercel root |
| `apps/worker/` | Reserved future sync/report worker boundary |
| `prisma/` | Schema, migrations, and seed support |
| `public/branding/` | Safe-to-serve AI Rankers brand assets |
| `tests/` | Unit and product verification tests |
| `VERCEL-ENVIRONMENT-VARIABLES.md` | Vercel environment-variable contract |

The current runnable Next.js application intentionally lives at the repository root in `app/`, `components/`, and `lib/`. This keeps the Vercel Root Directory as `./`. The `apps/` and reserved package boundaries are documented scaffolds; do not move the application into `apps/web` unless the Vercel configuration, package scripts, imports, and workspace build pipeline are migrated together.

## Requirements

- Node.js 24.x
- pnpm 11.x
- Neon PostgreSQL for runtime data
- Neon Auth for production authentication

The repository declares the Node version in both `package.json` and `.nvmrc`.

## Local setup

```bash
pnpm install
pnpm db:generate
pnpm dev
```

Copy `.env.example` to `.env.local` and provide local development values. Never commit `.env.local` or production secrets.

## Environment variables

Required application variables:

```env
DATABASE_URL=
DIRECT_URL=
NEON_AUTH_BASE_URL=
NEON_AUTH_COOKIE_SECRET=
```

See [VERCEL-ENVIRONMENT-VARIABLES.md](VERCEL-ENVIRONMENT-VARIABLES.md) for the Vercel setup, runtime/migration distinction, and security rules.

## Database workflow

Validate the schema:

```bash
pnpm db:validate
```

Apply committed migrations from a trusted environment:

```bash
pnpm db:deploy
```

Use `DIRECT_URL` for Prisma migration commands and `DATABASE_URL` for the application runtime. Do not run `prisma migrate dev` as part of a Vercel production build.

## Verification

```bash
pnpm db:validate
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

## Vercel deployment

Use the repository root as the Vercel Root Directory:

```text
Framework: Next.js
Root Directory: ./
Install Command: pnpm install --frozen-lockfile
Build Command: pnpm build
Output Directory: Next.js default
Node.js: 24.x
```

Deploy a Preview first, verify authentication, database access, authorization, portal routes, and admin routes, then promote the tested build to Production.

## Current implementation boundary

The current release contains the client portal foundation, admin operations surfaces, authentication entry points, goals, activities, reporting presentation, Prisma persistence, and Neon connection boundaries.

Some provider integrations and advanced CRM capabilities remain explicit implementation boundaries. Presentation/demo data is labeled in the UI and must not be represented as live provider data.

Production rules:

- Client scope is resolved server-side.
- Client users can only access their published client-safe workspace.
- Agency-only content must not appear in the client portal.
- Authentication must fail closed when production auth variables are missing.
- Provider values must retain source and freshness context.
