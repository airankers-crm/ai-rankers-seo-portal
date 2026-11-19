# Import and Edit Feature — Smoke Test

Date: 2026-11-19
Scope: Every client workspace, not a single seeded client. Tony Roofing is only the local QA fixture.

## Expected data flow

| Admin action | Stored origin | Portal selection | Expected result |
| --- | --- | --- | --- |
| Edit a metric result for any client | `MANAGED` | Automatically switches that client to `Managed DB data` | Edited published values appear in that client portal |
| Import a valid `.xlsx` workbook for any client | `MANAGED` | Automatically switches that client to `Managed DB data` | Imported cards and monthly rows appear in that client portal |
| Select `Google API data` for a client | `GOOGLE_API` | Google API | That client portal reads the latest synced provider rows |
| Select `Managed DB data` for a client | `MANAGED` | Admin/Excel values | That client portal reads admin-managed rows |

The toggle is client-level. It is displayed on the Workspace details, Website GSC, Analytics, and GBP admin screens, but one selection controls the source used by all screens for that client. It does not copy or delete either data set.

## Smoke cases

| ID | Check | Expected result |
| --- | --- | --- |
| SM-01 | Open any client workspace and download Website GSC, Analytics, and GBP templates | Each download is `.xlsx` and contains its focused input sheet plus a Summary tab. |
| SM-02 | Fill valid monthly values and preview/import for any client | Preview succeeds; rows are scoped to the selected screen; import writes Managed values. |
| SM-03 | Import Website GSC values | Organic traffic, Search clicks, Search impressions, CTR, Average position, and Keywords in top 10 parse without errors. |
| SM-04 | Import Analytics and GBP values | GA4 and GBP rows parse independently without cross-client or cross-screen leakage. |
| SM-05 | Upload `.csv` | Request is rejected; no database write occurs. |
| SM-06 | Enter CTR as `0.017` | Validation rejects the ambiguous decimal and instructs the operator to use percentage points, such as `1.7`. |
| SM-07 | Edit and publish a card for any client | The value is stored as `MANAGED`, that client becomes Managed DB mode, and portal cache is invalidated. |
| SM-08 | Toggle a client to Google API data | All portal screens for that client read `GOOGLE_API` rows; Managed rows remain stored. |
| SM-09 | Toggle the same client back to Managed DB data | All portal screens for that client read the imported/edited Managed rows immediately. |
| SM-10 | Repeat SM-01 through SM-09 with a second client | The first client’s mode and values remain unchanged; client scoping is preserved. |

## Automated smoke evidence

- `pnpm test` — passed: 7 test files, 34 tests.
- Generated and filled one-month workbooks — passed: Website GSC `6` rows, Analytics `11` rows, GBP `5` rows; zero validation errors.
- Tony Roofing local database fixture — confirmed and used as one smoke-test client; the implementation itself uses the route `clientId` and has no Tony-specific branch.
- `pnpm typecheck` — passed after the data-source/cache changes.
- `pnpm build` — passed.
- `git diff --check` — passed.

## Manual sign-off

For final browser sign-off, sign in as a Super Admin/Admin, test one client such as Tony Roofing, then repeat SM-10 with another client. Verify the portal after each source switch. Do not treat a different client’s browser session as evidence for the selected client.
