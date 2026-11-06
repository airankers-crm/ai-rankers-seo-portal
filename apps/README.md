# Application Boundaries

This directory is reserved for future deployable workspace applications.

## Current state

- `web/` is a placeholder boundary only. The runnable Next.js application currently lives at the repository root in `app/`, `components/`, and `lib/`.
- `worker/` is a placeholder boundary for future synchronization, report generation, email, and scheduled jobs.

Do not move the current web application into `apps/web` without migrating the Vercel root configuration, package scripts, imports, and workspace build pipeline together.
