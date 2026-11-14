# AI Rankers MetForm → CRM Lead Integration

## Document status

**Implementation status:** Built in the CRM codebase and verified locally.

**Live deployment status:** Not deployed from this change.

**Database status:** The new lead migration is prepared but not applied because the connected Neon database has migration-history drift that must be reconciled first.

**Scope:** McKoy HVAC & Refrigeration Services test workspace.

**Client workspace ID:** `cmwfhtt9v000007idb5trfzcp`

**WordPress site:** `https://mckoyhvac.theairankers.net/`

**CRM deployment currently known:** `https://ai-rankers-seo-portal-9y38.vercel.app/`

---

## 1. What was built

The CRM now has a first-party lead intake boundary for WordPress MetForm submissions:

```text
Website visitor
    ↓
WordPress MetForm
    ↓ POST + webhook secret
CRM webhook route
    ↓ validate + normalize + deduplicate
Neon PostgreSQL Lead record
    ↓ tenant-scoped query
Admin lead inbox        Client lead inbox
```

The implementation includes:

- A public, secret-authenticated MetForm webhook endpoint.
- A persistent `Lead` Prisma model associated with one client workspace.
- Normalization for common MetForm field names.
- Validation for name, phone/email, email format, URL safety, and field lengths.
- Duplicate protection for webhook retries when an entry ID is available.
- An agency/admin lead inbox at `/admin/leads`.
- A client-scoped lead inbox at `/portal/leads`.
- Search and status filtering.
- A lead-detail view with email, phone, service, status, and message.
- Tenant isolation: client users can only query leads belonging to their own authenticated workspace.
- Documentation for the required `METFORM_WEBHOOK_SECRET` environment variable.

This is intentionally the first CRM slice. It captures and displays inquiries. Lead ownership, automated follow-up, appointment conversion, revenue attribution, and pipeline automation remain later phases.

---

## 2. Code changes

### Webhook endpoint

File:

```text
app/api/webhooks/metform/[clientId]/route.ts
```

Endpoint:

```text
POST /api/webhooks/metform/{clientId}
```

McKoy HVAC endpoint after deployment:

```text
https://<crm-domain>/api/webhooks/metform/cmwfhtt9v000007idb5trfzcp
```

The endpoint accepts one of the following authentication methods:

Preferred header:

```http
x-metform-webhook-secret: <METFORM_WEBHOOK_SECRET>
```

Also accepted:

```http
Authorization: Bearer <METFORM_WEBHOOK_SECRET>
```

Fallback for a MetForm screen that exposes only a webhook URL field:

```text
https://<crm-domain>/api/webhooks/metform/cmwfhtt9v000007idb5trfzcp?token=<METFORM_WEBHOOK_SECRET>
```

The header is preferred because query-string secrets can appear in logs or monitoring tools.

### Payload normalization

File:

```text
lib/metform.ts
```

The normalizer accepts common field variants, including:

| CRM field | Accepted examples |
|---|---|
| Name | `name`, `full_name`, `fullName`, `your-name` |
| Phone | `phone`, `number`, `mobile`, `telephone` |
| Email | `email`, `email_address`, `emailAddress` |
| Service | `service`, `service_requested`, `serviceType`, `subject` |
| Message | `message`, `details`, `description`, `your-message` |
| Page URL | `pageUrl`, `page_url`, `sourceUrl`, `url` |
| Form ID | `formId`, `form_id` |
| Entry ID | `entryId`, `entry_id`, `eventId`, `id` |

A nested `data`, `fields`, or `formData` object is also supported.

### Database model

Files:

```text
prisma/schema.prisma
prisma/migrations/20261113140000_leads/migration.sql
```

The `Lead` record stores:

| Field | Purpose |
|---|---|
| `id` | Internal CRM lead identifier |
| `clientId` | Owning client workspace |
| `source` | Source label, currently `wordpress-metform` |
| `sourceEventId` | MetForm entry/event ID used for retry deduplication |
| `formId` | WordPress form identifier when supplied |
| `name` | Lead name |
| `phone` | Lead phone number |
| `email` | Lead email address |
| `service` | Requested service |
| `message` | Inquiry message |
| `pageUrl` | Page where the form was submitted |
| `submittedAt` | Source submission timestamp |
| `status` | `NEW`, `CONTACTED`, `QUALIFIED`, `WON`, or `LOST` |
| `createdAt` / `updatedAt` | CRM record timestamps |

The database has a composite uniqueness rule on:

```text
clientId + source + sourceEventId
```

That prevents the same MetForm entry from creating multiple CRM records during retries or concurrent deliveries.

### Admin lead screen

Route:

```text
/admin/leads
```

File:

```text
app/admin/leads/page.tsx
```

The admin screen reads up to 200 newest leads across client workspaces. It displays:

- Client workspace.
- Contact name.
- Email or phone preview.
- Requested service.
- Source.
- Lead status.
- Submission date/time.
- Lead detail modal.

Only authenticated admin users can access this route.

### Client lead screen

Route:

```text
/portal/leads
```

File:

```text
app/portal/leads/page.tsx
```

The client screen resolves the workspace from the authenticated user session. It does not accept a browser-provided client ID as the authority for the query.

The client sees only:

```text
WHERE Lead.clientId = authenticatedUser.clientId
```

The shared UI is implemented in:

```text
components/lead-inbox.tsx
```

Navigation links were added to:

```text
components/app-shell.tsx
```

### Security boundary

The public webhook is exempted from browser same-origin CSRF checks because it is called server-to-server by WordPress. It is still protected by `METFORM_WEBHOOK_SECRET`.

The proxy change is in:

```text
proxy.ts
```

The webhook will reject requests when:

- The server secret is missing.
- The supplied secret is missing or incorrect.
- The client workspace does not exist.
- The client workspace is archived.
- The payload is not a JSON object.
- The name is missing.
- Both phone and email are missing.
- The email format is invalid.

Secrets are never included in client-side code or audit payloads.

---

## 3. WordPress integration contract

### Current WordPress forms

The inspected McKoy HVAC WordPress site currently has:

- Main contact form: MetForm form ID `515`.
- Footer form: MetForm form ID `90`.

Configure the main contact form first. Configure the footer form as well if it is intended to create CRM inquiries.

### MetForm setup

The direct REST/webhook integration is a MetForm premium feature. The official MetForm documentation identifies REST API integration as requiring the Agency plan:

<https://wpmet.com/doc/rest-api-metform/>

In WordPress:

1. Open `MetForm → Forms`.
2. Edit form `515`.
3. Open the form settings.
4. Open the `Integration` tab.
5. Enable `REST API`.
6. Choose `POST`.
7. Enter the CRM webhook URL.
8. Add the webhook secret using the supported header field if available.
9. If the installed MetForm UI exposes only a URL field, use the documented URL-token fallback.
10. Save the form.

Recommended contact form fields:

- Name: required.
- Phone/Number: required unless email-only inquiries are intentionally supported.
- Email: required if email follow-up is part of the workflow.
- Service requested: recommended.
- Message: recommended.

The endpoint accepts either phone or email, but production lead quality is better when both are required for this HVAC contact form.

### Example synthetic payload

Use fake data only for the first test:

```json
{
  "entry_id": "synthetic-mckoy-001",
  "form_id": "515",
  "full_name": "Synthetic Test Customer",
  "phone": "555-555-0100",
  "email": "synthetic-test@example.com",
  "service_requested": "AC repair",
  "message": "Synthetic CRM integration test. Do not call.",
  "page_url": "https://mckoyhvac.theairankers.net/contact-us/",
  "submitted_at": "2026-11-13T00:00:00.000Z"
}
```

Expected response for a new lead:

```json
{
  "id": "<crm-lead-id>",
  "duplicate": false,
  "status": "accepted"
}
```

Expected response when the same entry is retried:

```json
{
  "id": "<same-crm-lead-id>",
  "duplicate": true,
  "status": "accepted"
}
```

---

## 4. Environment configuration

Add this server-only variable to the CRM deployment:

```env
METFORM_WEBHOOK_SECRET=<long-random-secret>
```

Configure it for the environment receiving the WordPress webhook. Do not use a `NEXT_PUBLIC_` prefix.

Existing environment variables remain required:

```env
DATABASE_URL=<runtime-neon-connection>
DIRECT_URL=<migration-neon-connection>
NEON_AUTH_BASE_URL=<neon-auth-url>
NEON_AUTH_COOKIE_SECRET=<private-cookie-secret>
APP_ORIGIN=<crm-origin>
```

The environment-variable reference is maintained in:

```text
VERCEL-ENVIRONMENT-VARIABLES.md
```

---

## 5. Verification completed

The following local checks passed after implementation:

```text
pnpm db:generate
pnpm db:validate
pnpm typecheck
pnpm lint
pnpm test
pnpm build
git diff --check
```

The test suite includes MetForm boundary tests for:

- Field normalization.
- Required name/contact validation.
- Email normalization.
- Secret comparison.
- Event ID handling.

The production build included these routes:

```text
/admin/leads
/portal/leads
/api/webhooks/metform/[clientId]
```

No live lead was created during this implementation.

---

## 6. Database migration blocker

The connected Neon database reported migration-history drift:

```text
The last common migration is: 20261113123000_report_delivery_status

Not yet applied locally:
20261113140000_leads

Database migrations not found in this checkout:
20261105224331_add_client_tasks
20261105224504_add_client_tasks
```

Because of this, the lead migration was not applied automatically.

Before running `pnpm db:deploy`, reconcile the migration history with the repository that originally applied the two missing database migrations. Do not use `prisma migrate dev` against the shared/production database as a shortcut.

Safe order:

1. Confirm which repository or deployment created the two missing migration IDs.
2. Bring the correct migration files into the canonical repository, or document the approved baseline according to the team’s migration policy.
3. Run `pnpm prisma migrate status` again.
4. Confirm the history is consistent.
5. Apply the lead migration using `pnpm db:deploy` from a trusted environment.
6. Verify the `Lead` table and indexes exist.
7. Deploy the CRM code.
8. Send one synthetic WordPress submission.
9. Verify the record in `/admin/leads` and `/portal/leads`.

Do not point WordPress at the endpoint until the deployment has both the new code and the `Lead` table.

---

## 7. What is not included yet

The current implementation does not yet include:

- Lead status editing from the UI.
- Lead assignment to an agency owner.
- Automated email or SMS follow-up.
- Appointment/calendar booking conversion.
- Opportunity/pipeline records.
- Revenue or booked-job attribution.
- Google Analytics conversion events.
- Call tracking ingestion.
- CRM notifications when a new lead arrives.
- Client-configurable webhook credentials.
- Webhook delivery history and retry dashboard.

These should be added after the basic capture-and-display flow is live and verified.

---

## 8. Recommended next phase

After the first synthetic lead succeeds:

1. Add a lead status update endpoint with admin-only mutation permissions.
2. Add lead assignment and follow-up owner fields.
3. Add a CRM notification for new leads.
4. Add webhook delivery logs with response status and retry count.
5. Add appointment conversion from a qualified lead.
6. Add verified source attribution from GA4/Search Console/GBP only after those integrations are connected.

The direct webhook path should remain the source-of-record intake boundary. n8n is optional middleware, not required for the current design. It becomes useful when the workflow needs branching, retries, notifications, or multiple downstream systems.
