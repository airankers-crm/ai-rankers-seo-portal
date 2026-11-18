# Client Portal QA Report

Date: 2026-11-17
Environment: Local Next.js portal at `http://localhost:3000`
Scope: Client-facing SaaS portal, shared navigation, reporting screens, settings, data states, and release readiness.

## Outcome

The portal UI and core interactions passed the final local QA pass. The shared client chrome is consistent across routes, the portal is client-scoped, empty states are explicit, filters and chart tooltips are interactive, and settings/preferences persist through the database-backed API.

Live GA4 and GBP provider reporting remains an external integration dependency. Until provider credentials and a successful sync are available, the portal intentionally shows zero/empty reporting states rather than fabricated metrics.

## Route coverage

| Route | Result | Coverage |
| --- | --- | --- |
| `/portal` | Pass | Overview, goals, GBP summary, recent work, reports, feedback entry, chart hover states |
| `/portal/website-seo` | Pass | SEO metrics, date/compare/channel filters, chart tabs, table, insights, acquisition channels, zero state |
| `/portal/analytics` | Pass | GA4 overview, KPI cards, sessions chart, realtime panel, source/page/event cards, date presets |
| `/portal/analytics/details` | Pass | Connection status, property facts, readiness, measured events, next steps |
| `/portal/analytics/pages` | Pass | Page-view summary, page performance table, detail navigation |
| `/portal/gbp` | Pass | GBP metrics, date/metric/channel/display filters, chart tabs, insights, zero state |
| `/portal/activities` | Pass | Activity list, task-request form, filters, detail dialog, responsive overflow handling |
| `/portal/feedback` | Pass | Feedback form, categories, attachment control, validation and draft persistence |
| `/portal/reports` | Pass | Report filters, search, published reports and detail links |
| `/portal/reports/[id]` | Pass | Published report detail route |
| `/portal/settings` | Pass | Business information, connection state, profile, notifications, security, workspace access |

## Functional QA

### Shared date-range control

The date picker is now shared across the portal and follows the requested two-stage interaction:

- First open shows presets only: Today, Yesterday, Last 3 days, Last 1 week, Last 3 weeks, Last 1 month, Last 6 months, and Last 1 year.
- Custom opens the two-month calendar with start/end fields.
- Preset and custom selections apply consistently to the current report.
- Cancel restores the prior selection; Reset restores the screen default.
- Analytics, Website SEO, GBP, overview, and report controls use the same date-range behavior.
- The control remains usable at mobile viewport widths without horizontal overflow.

### Charts and details

- Chart points expose readable hover tooltips and keyboard focus states.
- Date-range changes update chart labels, table periods, and empty-state copy.
- Analytics Top Pages links open the page-performance detail route.
- Analytics connection details expose property, stream, measurement ID, access scope, sync, readiness, and event states.
- SEO and GBP cards keep the same brand typography, borders, spacing, and empty-data treatment.

### Settings and client isolation

- Settings changes are persisted through the portal account API and restored after reload.
- Portal preferences use the `User.portalPreferences` JSON column from the applied Prisma migration.
- Client identity is sourced from the authenticated session and is carried through the reviewed portal routes.
- No cross-client leakage was reproduced during route and navigation checks.

### Resilience and security

- Background sync failures degrade to a controlled unavailable state with retry behavior instead of breaking the portal.
- Production CSP keeps development-only `unsafe-eval` out of production while allowing the local React development overlay.
- `pnpm audit --prod` reports no known production vulnerabilities after the Next.js and dependency updates.

## Automated checks

- `pnpm typecheck` — pass
- `pnpm lint` — pass
- `pnpm test` — pass, 5 files / 20 tests
- `pnpm db:validate` — pass
- `pnpm audit --prod` — upstream advisory remains for `picomatch@4.0.7` through `@neon/auth`/Better Auth; no patched release is currently available
- `pnpm build` — pass
- `git diff --check` — pass

## Known integration dependency

The portal is ready to consume real provider data, but the final live-data step still requires the client’s server-side GA4/GBP credentials, property/location selection, and a successful sync. This is intentionally represented as connection/readiness state in the UI; the current zero-state screens are not a failed UI implementation.

## Release status

Code is ready to commit and push to GitHub after the final release checks. Generated local QA artifacts under `output/` and `tmp/` are excluded from the source commit. The remaining audit advisory is tracked as an upstream dependency item and does not affect the production bundle path.
