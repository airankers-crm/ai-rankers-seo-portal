# New Client Workspace — Goal-Based QA

## QA goal

Prove that an Admin or Super Admin can create a clean, isolated client workspace quickly, with clear validation, safe input handling, predictable onboarding defaults, and no client visibility before the workspace is reviewed and published.

## User outcome

From `/admin/clients/new`, an operator should be able to:

1. Understand what is required before starting.
2. Enter a business name and optional website/contact details without guessing the format.
3. See immediate, actionable validation errors without losing entered values.
4. Create the workspace once and land on its guided setup screen.
5. Continue with business details, Google API or Excel data preparation, review, publish, and invitation steps.

## Acceptance criteria

- The page has one primary action: `Create workspace`.
- Business name is required, trimmed, and limited to 120 characters.
- Website accepts only safe `http` or `https` URLs without embedded credentials.
- Contact email is optional but validated when supplied.
- Validation errors are attached to the relevant field and announced with accessible error state.
- Network or server errors leave the form values intact and provide a retryable message.
- The submit button cannot create duplicate requests while creation is pending.
- A successful creation redirects to `/admin/clients/[id]` and opens the guided setup.
- New workspaces inherit the configured workspace timezone and start as admin-only draft workspaces.
- Default sections are created without exposing an unpublished portal to the client.
- Client slug generation skips every existing suffix, including gaps such as `acme-2` and `acme-3`.
- Unauthenticated users and client users cannot create workspaces.

## Detailed test cases

| ID | Test | Expected result | Evidence |
| --- | --- | --- | --- |
| NC-01 | Open `/admin/clients/new` while unauthenticated | Redirects to the admin sign-in flow | Browser URL |
| NC-02 | Open the route as a client user | Access is denied or redirected away from the admin surface | Browser result |
| NC-03 | Submit with an empty business name | Inline error says the business name is required; no request is sent | Browser/network |
| NC-04 | Submit a one-character or overlong business name | Inline length error appears; entered value remains | Browser result |
| NC-05 | Submit `javascript:`, credentialed, or malformed website input | Safe URL error appears; no client is created | Browser/network/database |
| NC-06 | Submit an invalid contact email | Inline email error appears; no client is created | Browser result |
| NC-07 | Enter valid name, URL, and email | Live portal preview updates initials/name; fields remain readable at mobile width | Screenshot |
| NC-08 | Submit valid values twice quickly | One request is accepted; button enters a loading state and prevents the second request | Browser/network |
| NC-09 | Create a valid workspace | HTTP 201 returns an ID; browser redirects to the new client’s guided setup | Response/browser |
| NC-10 | Inspect the created client | Workspace timezone matches settings, default sections exist, and status is `ACTIVE` with managed data mode | Database query |
| NC-11 | Create duplicate names with existing numbered slugs | New slugs are unique and skip all occupied suffixes | Database query |
| NC-12 | Simulate a 4xx/5xx/network failure | A safe error is shown, form values remain, and retry works | Browser/network |
| NC-13 | Inspect the new workspace as a client user before publish | No unpublished setup data is visible | Browser/database |
| NC-14 | Keyboard-only navigation | Back link, fields, validation, cancel, and create action have visible focus and logical order | Keyboard pass |
| NC-15 | Run project validation | Typecheck, lint, tests, and production build pass | Command output |

## Automated validation

Run from `Dashboard/`:

```text
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

The API remains server-authoritative: client-side checks improve feedback, but the route repeats the name, URL, and email validation before writing to the database.

## Release gate

The feature is not ready if a client can reach the admin form, malformed URLs are stored, a failed request clears the form, duplicate submissions create multiple workspaces, or a newly created workspace is client-visible before review and publish.
