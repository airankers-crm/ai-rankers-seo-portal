# Shared Packages

Shared packages contain domain and infrastructure code that should remain independent from the Next.js route layer.

## Active packages

- `core/` — typed demo domain data and metric helpers.
- `db/` — Prisma client and Neon PostgreSQL connection.

## Reserved boundaries

- `integrations/` — future Google, GBP, ranking, and call/form provider adapters.
- `ui/` — future extracted cross-application UI package.

Keep tenant-aware authorization and business rules in shared packages as the product grows. Keep route handlers focused on request validation, session scope, and calling shared services.
