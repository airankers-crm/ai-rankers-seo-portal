# Google Integration Goal Base — Detailed QA Plan

## QA goal

Prove that the Google integration foundation is secure, tenant-isolated, Super Admin-controlled, and correctly mapped to the three client-facing reporting destinations:

| Provider | Super Admin configuration | Client Portal destination |
| --- | --- | --- |
| Google Search Console | Google resource discovery and site selection | Website SEO — `app/portal/website-seo/page.tsx` |
| Google Analytics 4 | GA4 property discovery and property selection | Analytics — `app/portal/analytics/page.tsx` |
| Google Business Profile | GBP account/location discovery and location selection | GBP Performance — `app/portal/gbp/page.tsx` |

The client portal must only consume published, tenant-scoped metric data. It must never own Google credentials or connection controls.

## Current implementation under QA

Implemented foundation:

- `GoogleIntegration`, `IntegrationSyncRun`, and `GoogleOAuthState` Prisma models.
- Migration: `prisma/migrations/20261117130000_google_integration_foundation/`.
- AES-256-GCM encryption in `lib/security/encryption.ts`.
- OAuth connect/callback routes with state hashing, expiry, one-time use, and PKCE.
- Super Admin-only Google connect, property discovery, configuration, and disconnect routes.
- Native server-side discovery calls for GA4, Search Console, and GBP resources.
- Idempotent Google section/metric provisioning.
- `MetricValue.isOverride` protection through `writeGoogleMetricValue`.
- Super Admin Integrations page backed by real client and integration records.
- Sync Health page backed by persisted sync-run records.

Implemented in this release and requiring live-provider QA:

- Live GA4 reporting fetchers in `lib/google/reporting.ts`.
- Live Search Console Search Analytics fetchers in `lib/google/reporting.ts`.
- Live GBP Performance and review fetchers in `lib/google/reporting.ts`.
- Twelve-month historical backfill execution through the sync worker.
- Twice-daily `/api/cron/google-sync` route and multi-client orchestration.
- Idempotent provider writes into `MetricValue`, with manual override protection.

No fake provider records may be introduced to make a blocked test pass.

## Environment and test prerequisites

### Local automated validation

Run from `Dashboard/`:

```text
pnpm db:validate
pnpm db:generate
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Expected result: all commands exit successfully with no TypeScript, Prisma, lint, test, or production-build errors.

### Database prerequisites

- Apply the committed migration from a trusted environment with `DIRECT_URL` configured.
- Confirm the three new tables exist: `GoogleIntegration`, `IntegrationSyncRun`, and `GoogleOAuthState`.
- Confirm enum values match the Prisma schema.
- Confirm foreign keys cascade from `Client` as intended.
- Confirm encrypted token columns contain no plaintext test secrets.

### Google Cloud prerequisites

Before live-provider QA, configure server-only values:

```text
INTEGRATION_ENCRYPTION_KEY=<base64-encoded 32-byte key>
GOOGLE_CLIENT_ID=<Google OAuth web client ID>
GOOGLE_CLIENT_SECRET=<Google OAuth web client secret>
GOOGLE_OAUTH_REDIRECT_URI=https://<host>/api/integrations/google/callback
CRON_SECRET=<long random server-only secret>
```

Enable and authorize the Google APIs required by the current discovery implementation and later reporting fetchers. Use a test Google account with access to at least one GA4 property, one Search Console site, and one GBP location.

## Test data matrix

| Fixture | Purpose |
| --- | --- |
| Client A | Connected Google account with all three resources available |
| Client B | No integration row; validates first-time connection and provisioning |
| Client C | Connected GA4 only; validates partial provider configuration |
| Client D | Revoked/expired Google authorization; validates reconnect-required state |
| Super Admin | Full integration management access |
| Agency Admin | Validate behavior against the project’s chosen admin-role policy |
| Client User A | Portal-only access to Client A |
| Client User B | Portal-only access to Client B and cross-tenant isolation checks |

Use distinct client IDs and distinct provider resource identifiers. Never reuse a real customer token for QA.

## Detailed test cases

### A. Super Admin access and tenant scope

| ID | Test | Expected result | Evidence |
| --- | --- | --- | --- |
| A-01 | Open `/admin/integrations` unauthenticated | Redirects to the admin login flow | Browser/network result |
| A-02 | Open `/admin/integrations` as a client user | Access is denied or redirected away from the admin surface | Browser result and server log |
| A-03 | Open `/admin/integrations` as Super Admin | All active/non-archived client workspaces are listed | Screenshot and database query |
| A-04 | Request connect with missing `clientId` | Returns HTTP 400 with a safe JSON error | Response body/status |
| A-05 | Request properties with missing `clientId` | Returns HTTP 400 with a safe JSON error | Response body/status |
| A-06 | Request config/disconnect as a client user | Request is rejected before mutation | Response body/status |
| A-07 | Use an archived client ID | Connection/configuration is rejected with HTTP 404 | Response body/status |
| A-08 | Verify every integration row has a valid `Client.id` | No orphaned integration, state, or sync rows exist | SQL query |

### B. OAuth configuration and state security

| ID | Test | Expected result | Evidence |
| --- | --- | --- | --- |
| B-01 | Remove Google OAuth env vars and click Connect | Redirects to Integrations with a configuration error; no OAuth state is created | URL, database query |
| B-02 | Click Connect with valid Google config | Redirects to Google with state, PKCE challenge, offline access, and required scopes | Captured redirect URL without secrets |
| B-03 | Inspect persisted OAuth state | Only a state hash and encrypted PKCE verifier are stored | Database row |
| B-04 | Return with invalid state | Callback rejects the request and does not connect the client | URL/status and database row |
| B-05 | Return with expired state | Callback rejects the request | URL/status |
| B-06 | Replay a previously consumed state | Callback rejects the second request | URL/status and consumedAt |
| B-07 | Return a provider denial | Client is not marked connected; user receives a safe denial message | URL/status |
| B-08 | Use a callback for a different logged-in admin | Callback rejects the user/state mismatch | URL/status |
| B-09 | Confirm redirect destination | Callback only redirects to the fixed Super Admin Integrations page | URL inspection |
| B-10 | Confirm no authorization code/token appears in logs or query messages | Sensitive values are absent | Log review |

### C. Token encryption and refresh foundation

| ID | Test | Expected result | Evidence |
| --- | --- | --- | --- |
| C-01 | Encrypt and decrypt a test secret | Original value is recovered | Automated test |
| C-02 | Inspect encrypted payload | Plaintext token is absent; payload is versioned and authenticated | Database/value inspection |
| C-03 | Change one ciphertext character | Decryption fails | Automated test |
| C-04 | Remove `INTEGRATION_ENCRYPTION_KEY` | Encryption/decryption fails closed with a controlled server error | Test output |
| C-05 | Use an invalid-length key | Application rejects the key | Test output |
| C-06 | Expire an access token with a valid refresh token | Server refreshes access and stores only encrypted replacement data | Database and provider mock |
| C-07 | Return `invalid_grant` from refresh | Integration becomes `RECONNECT_REQUIRED`; no token is exposed | Database/status response |

### D. Provider property discovery

| ID | Test | Expected result | Evidence |
| --- | --- | --- | --- |
| D-01 | Discover GA4 properties | Dropdown-ready property IDs and display labels are returned | JSON response |
| D-02 | Discover Search Console sites | Site URLs and permission levels are returned | JSON response |
| D-03 | Discover GBP accounts | Account IDs and labels are returned | JSON response |
| D-04 | Discover GBP locations | Location IDs, labels, and account IDs are returned | JSON response |
| D-05 | Provider returns one failure and two successes | Successful provider results remain available and failed provider is reported separately | JSON response |
| D-06 | Provider returns 401/403 | Response is safe; integration is marked reconnect-required where applicable | Status and database row |
| D-07 | Provider returns rate limit | Response contains no secret; retryable failure is recorded | Status and sync/error record |
| D-08 | Inspect response for credentials | No access token, refresh token, authorization code, or encrypted payload is returned | JSON inspection |
| D-09 | Query another client’s `clientId` as a client user | Request is rejected | Response/status |

### E. Super Admin resource configuration

| ID | Test | Expected result | Evidence |
| --- | --- | --- | --- |
| E-01 | Select GA4 property, GSC site, GBP account, and GBP location | Values save to the selected client’s `GoogleIntegration` row | Database query |
| E-02 | Clear one provider selection | Only that field becomes null; other selections remain unchanged | Database query |
| E-03 | Submit malformed/oversized identifiers | Request returns HTTP 400 and makes no mutation | Response/database |
| E-04 | Configure Client A, then inspect Client B | Client B has no copied provider identifiers | Database query |
| E-05 | Refresh the Integrations page | Saved selections and account email reappear | Browser screenshot |
| E-06 | Confirm audit log | Connect/configure/disconnect actions have actor, client, action, and entity context | AuditLog query |

### F. Metric and section provisioning

| ID | Test | Expected result | Evidence |
| --- | --- | --- | --- |
| F-01 | Connect a brand-new client with no metrics | Required Overview, Website SEO, and GBP sections/metrics are created | Database query |
| F-02 | Run provisioning twice | No duplicate sections, metrics, or GBP presentation rows are created | Database counts |
| F-03 | Confirm metric source mapping | GA4 metrics use GA4, GSC metrics use GSC, GBP metrics use GBP | Database query |
| F-04 | Confirm page mapping keys | GSC keys target Website SEO, GA4 keys target Analytics, GBP keys target GBP Performance | Code/data inspection |
| F-05 | Confirm tenant uniqueness | `clientId + key` prevents cross-client or duplicate metric parents | Prisma constraint/query |
| F-06 | Confirm publication state | Provisioned rows follow the documented visible/published policy | Database query and portal result |

### G. Manual override protection

| ID | Test | Expected result | Evidence |
| --- | --- | --- | --- |
| G-01 | Create an overridden MetricValue | `isOverride` is true and value is agency-controlled | Database row |
| G-02 | Run provider value write for the same period/source | Value remains unchanged and result is `overridden` | Database/result |
| G-03 | Run provider write for a non-overridden value | Value is created or updated | Database/result |
| G-04 | Review sync counters | Override count increments and skipped count is visible to Super Admin | Sync run/UI |
| G-05 | Confirm override across clients | An override in Client A cannot affect Client B | Database/query |

### H. Canonical client portal mapping

| ID | Test | Expected result | Evidence |
| --- | --- | --- | --- |
| H-01 | Publish GSC impressions/clicks for Client A | Values appear on Website SEO only | Website SEO screenshot/data |
| H-02 | Publish GA4 sessions/users/events for Client A | Values appear on Analytics only | Analytics screenshot/data |
| H-03 | Publish GBP views/calls/clicks/directions/reviews for Client A | Values appear on GBP Performance only | GBP screenshot/data |
| H-04 | Inspect Analytics page with only GSC data | It does not display GSC values as GA4 values | Screenshot/data |
| H-05 | Inspect Website SEO page with only GBP data | It does not display GBP values as Search Console data | Screenshot/data |
| H-06 | Inspect GBP page with only GA4 data | It does not display GA4 values as GBP data | Screenshot/data |
| H-07 | Hide or draft a metric | Client portal does not display it | Database/UI |
| H-08 | Use Client User A to request Client B data | No Client B data is returned | Response/database |
| H-09 | Confirm freshness/empty state | Missing or delayed data displays an explicit waiting/delayed state, not invented values | Screenshot |

### I. Disconnect and recovery

| ID | Test | Expected result | Evidence |
| --- | --- | --- | --- |
| I-01 | Disconnect a connected client | GoogleIntegration credentials and connection record are removed; audit event remains | Database query |
| I-02 | Google revoke endpoint succeeds | Disconnect completes normally | Provider mock/log |
| I-03 | Google revoke endpoint fails | Local credentials are still removed and response remains safe | Database/response |
| I-04 | Reconnect after disconnect | A new OAuth state is created and connection can be restored | Database/browser |
| I-05 | Provider access is revoked externally | Next protected API call reports reconnect-required without leaking provider details | Status/UI |

### J. Sync-health and operations

| ID | Test | Expected result | Evidence |
| --- | --- | --- | --- |
| J-01 | Open Sync Health with no runs | Clear empty state explains that no sync runs exist | Screenshot |
| J-02 | Insert representative run records | Super Admin sees client, mode, status, completion, coverage, and error | Screenshot/database |
| J-03 | Record a failed run | Error is visible to Super Admin but sanitized | Screenshot/log |
| J-04 | Record a partial run | Successful provider counts and failed-provider warning are distinguishable | Screenshot/database |
| J-05 | Inspect client portal after failed run | Previously published safe data remains available; no raw error appears | Screenshot |

### K. Live provider sync

| ID | Test | Expected result | Evidence |
| --- | --- | --- | --- |
| K-01 | Click “Sync Google data now” for a connected client with selected resources | A manual run is recorded and provider values are written to the correct tenant | Sync Health and database query |
| K-02 | Run the same manual sync twice | Existing non-overridden periods update idempotently; duplicate values are not created | Unique-constraint/query evidence |
| K-03 | Configure only GA4 | GA4 succeeds while unconfigured GSC/GBP are reported as warnings; no fake rows are created | Sync summary/database |
| K-04 | Send a cron request without the bearer secret | HTTP 401; no provider request or database mutation occurs | Response/log evidence |
| K-05 | Send a cron request with the configured secret | Connected clients are processed and only sanitized summaries are returned | Response/log evidence |
| K-06 | Make one provider return an API error | Run becomes PARTIAL when another provider succeeds; prior values remain intact | Sync Health/database |
| K-07 | Run sync with an overridden period | Override remains unchanged and `rowsOverridden` increments | Database/result |

## Security QA gates

The release fails QA if any of the following occurs:

- A client user can connect, disconnect, discover, or configure Google resources.
- A request can read or mutate another client’s integration without Super Admin authorization.
- A token, authorization code, PKCE verifier, encryption payload, or client secret appears in a response, log, URL, React prop, or client bundle.
- OAuth state can be replayed, used by another user, or used after expiration.
- An `isOverride` MetricValue is overwritten or deleted by provider sync.
- Provider data is rendered on the wrong client portal page.
- A provider error causes published values from another provider to be erased.
- The application fabricates provider resources or reporting data when credentials/API access are unavailable.

## Release evidence package

Attach the following evidence before enabling production connections:

1. Output from all local automated validation commands.
2. Applied migration status.
3. OAuth redirect and scope configuration with secrets redacted.
4. Super Admin Integrations screenshots for connected, not connected, error, and reconnect-required states.
5. Discovery response samples with tokens and personal data redacted.
6. Database evidence for tenant IDs, encrypted token fields, selected resource IDs, and audit logs.
7. Manual override preservation evidence.
8. One end-to-end evidence set for each page mapping: GSC → Website SEO, GA4 → Analytics, GBP → GBP Performance.
9. Live-provider evidence for K-01 through K-07, with API responses and credentials redacted.

## QA completion definition

This QA goal is complete only when the Super Admin can manage the full Google connection lifecycle for multiple client workspaces, each provider’s data reaches the correct client portal page, credentials remain protected, overrides remain authoritative, and every blocked or failed state is visible without exposing secrets.
