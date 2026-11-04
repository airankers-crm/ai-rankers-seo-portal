# AI Rankers Dashboard Codebase

This folder is the application-code root for the AI Rankers SEO Client Portal.

## Current structure

| Path | Responsibility |
| --- | --- |
| `app` and `components` | Next.js web application, admin workspace, client portal and shared UI |
| `apps/worker` | Google/SEO synchronization, report generation, email and scheduled jobs |
| `packages/db` | Prisma client, schema, migrations and scoped database access |
| `packages/core` | Client isolation, roles, metrics, publishing, reports and audit contracts |
| `packages/integrations` | Search Console, GA4, GBP and rank-provider adapters |
| `packages/ui` | Shared accessible components, cards, charts and report UI |
| `prisma` | Database schema, seed data and migration support |
| `public` | Public application assets that are safe to serve |
| `tests` | Unit, integration, isolation and end-to-end tests |

## Batch 1 implementation

The first runnable vertical slice is now available:

- `/portal` — responsive Riverstone Dental client portal preview
- `/admin` — AI Rankers workspace overview and client list
- `packages/core` — typed demo domain data and metric trend helpers
- `prisma/schema.prisma` — initial PostgreSQL data model
- `tests/metrics.test.ts` — first metric calculation tests

Run locally from this folder:

```bash
pnpm install
pnpm dev
```

Verification commands:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

The current screens use typed demo data. Authentication, database persistence, live provider adapters, background sync, and private report storage remain subsequent modules in the Batch 1 plan.

## Implementation rule

Keep tenant-aware business logic in `packages/core` and database access in `packages/db`. The web and worker applications should call these shared packages rather than duplicating authorization or metric logic.

The architecture baseline is documented in `../docs/AI-Rankers-SEO-Portal-Architecture.md` and the final support validation report is in `../docs/AI-Rankers-Support-Team-Requirements-Report.docx`.
