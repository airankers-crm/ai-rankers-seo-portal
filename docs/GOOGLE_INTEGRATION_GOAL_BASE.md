# Google Integrations Feature — Goal Base

## Goal

Build a production-ready multi-client Google integration managed entirely from the Super Admin Portal.

The Super Admin owns OAuth, Google resource discovery, provider selection, connection status, disconnect/reconnect, sync health, and publishing decisions. The client portal only displays approved tenant-scoped reporting data.

## Canonical provider mapping

| Provider | Client portal page | Route |
| --- | --- | --- |
| Google Search Console | Website SEO | `app/portal/website-seo/page.tsx` |
| Google Analytics 4 | Analytics | `app/portal/analytics/page.tsx` |
| Google Business Profile | GBP Performance | `app/portal/gbp/page.tsx` |

Provider data must not be collapsed into a generic Google dashboard or rendered on the wrong page.

## Completed foundation

- Added tenant-scoped `GoogleIntegration`, `IntegrationSyncRun`, and `GoogleOAuthState` Prisma models.
- Added migration `prisma/migrations/20261117130000_google_integration_foundation/`.
- Added AES-256-GCM secret encryption and PKCE verifier protection.
- Added Super Admin-only connect, callback, discovery, configuration, and disconnect routes.
- Added GA4, Search Console, and GBP discovery adapters.
- Added idempotent Google metric/section provisioning.
- Added manual override protection for `MetricValue.isOverride`.
- Replaced the placeholder Super Admin Integrations page.
- Connected Sync Health to persisted sync-run records.

## Remaining implementation phases

1. Add live GA4 Data API reporting fetchers.
2. Add Search Console Search Analytics fetchers.
3. Add GBP Performance reporting fetchers.
4. Add six-to-twelve-month historical backfill.
5. Add twice-daily scheduled sync with bounded multi-client batches.
6. Add production sync writes, cache revalidation, retries, and provider-specific error handling.

## Security requirements

- Google credentials remain server-only and encrypted.
- OAuth state is hashed, user/client-bound, expiring, and single-use.
- Client users cannot manage integrations.
- Every integration and sync record is scoped to `Client.id`.
- `MetricValue.isOverride` is authoritative and must never be overwritten by provider sync.
- No provider response may expose access tokens, refresh tokens, authorization codes, or encryption payloads.

## Completion definition

The feature is complete when a Super Admin can connect and configure all three Google providers for multiple client workspaces, run safe historical and scheduled syncs, inspect sync health, preserve manual overrides, and verify that GSC appears on Website SEO, GA4 appears on Analytics, and GBP appears on GBP Performance.

## QA

Use [GOOGLE_INTEGRATION_GOAL_BASE_QA.md](GOOGLE_INTEGRATION_GOAL_BASE_QA.md) for the detailed test matrix, release gates, security cases, portal mapping tests, and evidence requirements.
