# Database Layer

This directory contains the PostgreSQL schema and committed Prisma migrations for AI Rankers.

## Commands

```bash
pnpm db:validate
pnpm db:generate
pnpm prisma migrate status
pnpm db:deploy
```

Use `DATABASE_URL` for the application runtime and `DIRECT_URL` for Prisma migration commands. Do not run `prisma migrate dev` as part of a Vercel production build.

Never commit `.env.local`, database passwords, OAuth credentials, or auth secrets.
