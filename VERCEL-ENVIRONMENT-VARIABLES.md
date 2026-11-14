# AI Rankers Vercel Environment Variables

This file documents the environment-variable names used by the application. It intentionally contains no secret values.

## Required in Vercel

Configure these variables for both Preview and Production as appropriate:

| Variable | Required | Used by | Purpose |
|---|---|---|---|
| `DATABASE_URL` | Yes | `packages/db/src/client.ts` | Pooled Neon PostgreSQL connection used by the application runtime. |
| `DIRECT_URL` | Yes for migrations | `prisma.config.ts` | Direct Neon PostgreSQL connection used by Prisma migration commands. |
| `NEON_AUTH_BASE_URL` | Yes for authentication | `lib/auth/server.ts` | Neon Auth server URL used to create the server auth client. |
| `NEON_AUTH_COOKIE_SECRET` | Yes for authentication | `lib/auth/server.ts` | Private cookie-signing secret. Generate a strong production-only value. |
| `METFORM_WEBHOOK_SECRET` | Yes for lead intake | `app/api/webhooks/metform/[clientId]/route.ts` | Private shared secret used by WordPress MetForm to authenticate lead submissions. |
| `APP_ORIGIN` | Recommended | `proxy.ts` | Canonical browser origin used for CSRF/Origin validation, such as `https://portal.example.com`. |

## Optional or provider-managed values

These values may be provided by a Neon/Vercel integration, but the current application does not read them directly:

- `DATABASE_URL_UNPOOLED`
- `NEON_BRANCH`
- `NEON_AUTH_JWKS_URL`

Do not add variables just because they exist in a local machine file. Add them only when the application or an enabled integration needs them.

## Vercel setup

Use the Vercel project settings:

- Framework: Next.js
- Root Directory: `./`
- Install Command: `pnpm install --frozen-lockfile`
- Build Command: `pnpm build`
- Output Directory: Next.js default
- Node.js: 24.x, matching `package.json`

Set real values in the Vercel Environment Variables panel. Do not commit `.env.local`, paste secret values into GitHub, or place secret values in this document.

## Migration procedure

The regular Vercel build should not run `prisma migrate dev`.

Run migrations separately from a trusted CI/local environment with `DIRECT_URL` configured:

```text
pnpm db:deploy
```

Verify migration status before production release:

```text
pnpm prisma migrate status
```

## Security rule

If `NEON_AUTH_BASE_URL` or `NEON_AUTH_COOKIE_SECRET` is missing in production, the application must fail closed rather than expose preview/demo access.

Keep `METFORM_WEBHOOK_SECRET` server-only. Never expose it as a `NEXT_PUBLIC_` variable or include it in client-side code.
