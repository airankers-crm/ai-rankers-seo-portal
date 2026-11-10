# Reusable Web Application Security Baseline

Version: 1.0
Status: Baseline standard for new and existing web applications

This document is a reusable security baseline for web applications, dashboards, portals, and CRM systems. Adapt the implementation details to the framework, database, hosting provider, and data classification of each project.

## 1. Security objectives

Every application should:

- Protect user accounts, sessions, business data, and secrets.
- Enforce authorization on the server for every protected page and API route.
- Keep tenants, workspaces, projects, and customer records isolated.
- Reject unsafe input before it reaches a database, browser, command, or external service.
- Make sensitive changes traceable through reliable audit events.
- Fail closed when authentication, configuration, or data access is unavailable.
- Detect, contain, and recover from abuse or compromise.

Security controls must be implemented at shared boundaries so that new screens and endpoints inherit protection by default.

## 2. Security scope

Apply this baseline to:

- Browser pages and client-side actions
- API routes, server actions, webhooks, and background jobs
- Authentication and invitation flows
- Databases, caches, object storage, and search indexes
- Third-party integrations and OAuth credentials
- CI/CD, deployment, preview environments, and infrastructure
- Logs, analytics, backups, exports, and support tools

## 3. Baseline threat model

Assume the application will encounter:

- Unauthenticated internet traffic
- Credential stuffing and automated abuse
- A compromised or malicious authenticated user
- Cross-tenant access attempts
- Malicious links, files, HTML, JSON, and uploaded content
- Replay or forgery of webhook requests
- Dependency or build-pipeline compromise
- Accidental secret exposure
- Stale, partial, delayed, or incorrect provider data

For each important feature, document:

1. Who can access it?
2. Which tenant or resource is in scope?
3. Which data can be read or changed?
4. Which external systems are called?
5. What happens when authentication, authorization, or the provider fails?
6. What audit evidence is created?

## 4. Authentication and account lifecycle

### Required baseline

- Use a maintained authentication provider or reviewed server-side implementation.
- Store sessions in secure, HttpOnly cookies.
- Use Secure cookies in production.
- Set an intentional SameSite policy.
- Verify email ownership before linking an account to an existing local record.
- Never rebind an existing account to a different authentication identity using email alone.
- Expire sessions after an appropriate period and support global sign-out.
- Disable accounts server-side; do not rely only on hiding UI controls.
- Prevent disabled, suspended, or deleted users from continuing to access data.
- Rate-limit login, password recovery, sign-up, invitation, and verification actions.

### Account linking rule

An authenticated identity may be linked to an existing local account only when at least one trusted condition is true:

- The identity is already linked by provider user ID.
- The provider confirms verified ownership of the exact email and the account is explicitly eligible for linking.
- A valid invitation or administrator-approved linking workflow authorizes the connection.

### Optional future phase: MFA and passkeys

MFA/passkeys are not required for the baseline version of this document. They should be added as a future security phase when the product is ready for:

- TOTP or authenticator applications
- WebAuthn/passkeys
- Recovery codes and account-recovery controls
- Step-up authentication for sensitive actions
- Admin-only MFA enforcement
- Device and session management

Until then, protect privileged accounts with strong provider authentication, short sessions, re-authentication for sensitive changes, and strict role controls.

## 5. Authorization and tenant isolation

### Required baseline

- Authorize on the server for every page, API route, job, export, and file download.
- Use deny-by-default permissions.
- Do not trust `clientId`, `workspaceId`, `userId`, role, or ownership values supplied by the browser.
- Resolve the acting user from the server-side session.
- Resolve the tenant from the authenticated user and server-side resource ownership.
- Scope every database read and write by tenant/resource ownership.
- Check the status of the tenant and resource, not only the user role.
- Prevent client users from accessing paused, archived, or deleted workspaces.
- Validate that related records belong to the same tenant, such as task assignees, metric sections, goals, files, and conversations.

### Role design

Define permissions separately from UI navigation. At minimum, distinguish:

- Super administrator
- Administrator or agency operator
- Tenant administrator
- Standard client user
- Read-only or support user

Only the highest approved role should be able to grant roles, disable accounts, change tenant assignments, or alter security settings. Protect the last privileged account from accidental removal.

### Authorization test cases

For each resource, test:

- User A cannot read User B’s tenant.
- User A cannot modify User B’s tenant.
- A user assigned to a paused tenant cannot use tenant APIs.
- An administrator cannot grant a privilege they do not possess.
- A client user cannot edit an admin-only resource.
- A guessed resource ID returns denial or a safe not-found response.

## 6. Input validation and output encoding

- Validate request bodies against explicit schemas.
- Enforce length, type, enum, range, date, and business-rule constraints.
- Reject unknown or unexpected fields where practical.
- Normalize values once at the server boundary.
- Use parameterized database queries or ORM methods.
- Never concatenate SQL, shell commands, HTML, or JavaScript from user input.
- Render user text as text, not raw HTML.
- Sanitize rich text with an allowlist if rich text is required.
- Validate URLs by scheme and destination policy; parsing alone is insufficient.
- Reject `javascript:`, `data:`, `vbscript:`, `file:`, credential-bearing, and unsupported URL schemes.
- Revalidate persisted untrusted data at read/render boundaries.

## 7. Browser and request protection

### CSRF and Origin protection

For cookie-authenticated state-changing requests (`POST`, `PUT`, `PATCH`, and `DELETE`):

- Require a matching trusted `Origin` header.
- Use `Referer` only as a controlled fallback.
- Add a synchronizer or double-submit CSRF token where Origin checks are insufficient.
- Exempt only documented provider callbacks or webhook endpoints with their own verification.
- Test requests with missing, foreign, malformed, and valid Origin headers.

### Security headers

Configure and verify:

- Content-Security-Policy
- Strict-Transport-Security in HTTPS production environments
- X-Content-Type-Options: `nosniff`
- Frame protection using `frame-ancestors` and/or `X-Frame-Options`
- Referrer-Policy
- Permissions-Policy

Start with a restrictive CSP and explicitly document any required exceptions. Avoid broad `*` source allowances.

## 8. Rate limiting and abuse controls

Use layered limits:

- Edge or WAF limits by IP and route
- Authenticated limits by user and tenant
- Database or business limits for expensive actions

At minimum, limit:

- Login and password recovery
- Sign-up, verification, and onboarding
- Invitation creation and acceptance attempts
- Chat messages and file submissions
- Feedback, task, export, and report generation
- Admin role, client, and publication changes
- Webhook retries and provider synchronization

Return `429 Too Many Requests` with a safe `Retry-After` value. Use a distributed limiter for horizontally scaled or serverless deployments; process-local counters are not sufficient.

## 9. Files, links, and attachments

- Prefer private object storage over arbitrary external links.
- Generate short-lived signed upload and download URLs.
- Validate file size, type, extension, and detected content type.
- Scan uploads for malware before making them available.
- Store files outside the public web root.
- Do not expose storage credentials to browsers.
- Prevent cross-tenant file access.
- Apply retention and deletion rules.
- Log file upload, download, sharing, and deletion events.

If external links are temporarily supported, permit only approved schemes and clearly label them as external. Never fetch arbitrary user URLs from the server without SSRF protections.

## 10. Database and data protection

- Keep database credentials server-side only.
- Use pooled runtime connections and restricted migration credentials where applicable.
- Use least-privilege database roles.
- Encrypt data in transit and at rest.
- Add foreign keys and tenant-scoped indexes.
- Use transactions for state changes that must remain consistent.
- Use conditional updates for one-time actions such as invitation acceptance.
- Make audit creation part of the same transaction as the sensitive change.
- Avoid returning unnecessary PII in API responses.
- Define retention, export, correction, and deletion procedures.

## 11. OAuth, APIs, webhooks, and synchronization

- Store provider tokens encrypted or in a managed secret/token vault.
- Request the narrowest provider scopes.
- Never expose provider refresh tokens to clients.
- Verify webhook signatures and timestamps.
- Reject replays with event IDs or idempotency keys.
- Record provider sync attempts, freshness, rows processed, warnings, retries, and failures.
- Make sync writes idempotent.
- Show stale or delayed data clearly instead of presenting it as current.
- Keep provider-specific credentials and errors out of client-visible responses.

## 12. Logging and auditability

Create append-only or tamper-resistant audit events for:

- Login and authentication failures
- Account linking and session changes
- Role, status, and tenant assignment changes
- Invitations created, accepted, revoked, and expired
- Client settings and data publication
- Provider connection and token changes
- File access and exports
- Security policy and configuration changes

Each event should include actor, tenant, action, resource, timestamp, request ID, and safe before/after context. Never store passwords, tokens, raw cookies, or unnecessary secrets in logs.

## 13. Secrets and environments

- Never commit `.env` files, API keys, database passwords, OAuth tokens, or private keys.
- Use separate secrets for local, preview, staging, and production.
- Rotate secrets after suspected exposure or personnel changes.
- Use managed secret storage and short-lived credentials where possible.
- Prevent preview deployments from using production data unless explicitly approved.
- Configure a canonical application origin for CSRF validation.
- Keep production authentication fail-closed when required variables are missing.

## 14. Dependencies and CI/CD

Every repository should run on pull requests and protected branches:

- Frozen dependency installation
- Production dependency audit
- Dependency review for pull requests
- Secret scanning
- Static analysis or SAST
- Typecheck and lint
- Unit and integration tests
- Database schema validation and migration checks
- Production build
- Authorization and tenant-isolation tests

Require the security workflow to pass before merging. Review new third-party actions and packages for provenance, maintenance, permissions, and known vulnerabilities.

## 15. Backups, recovery, and incident response

- Enable automated backups and point-in-time recovery where supported.
- Test restoration regularly in an isolated environment.
- Define recovery point and recovery time objectives.
- Maintain an incident contact list.
- Prepare procedures for credential rotation, account disablement, data exposure, and provider compromise.
- Preserve relevant logs and timelines during an incident.
- Document customer notification and regulatory obligations.

## 16. Release checklist

Before production release, confirm:

- [ ] Production authentication is configured and fail-closed.
- [ ] Privileged roles and tenant permissions are tested.
- [ ] All protected routes enforce server-side authorization.
- [ ] State-changing APIs enforce Origin/CSRF protection.
- [ ] Security headers are present in production responses.
- [ ] Unsafe URLs, HTML, files, and commands are rejected.
- [ ] Rate limits cover authentication, expensive actions, and admin mutations.
- [ ] No secrets are committed or exposed in client bundles.
- [ ] Dependency audit reports no unresolved high or critical findings.
- [ ] CI checks pass on the exact commit being deployed.
- [ ] Database migrations are reviewed and reversible where possible.
- [ ] Backups and restore procedures are verified.
- [ ] Monitoring and security alerts are active.
- [ ] MFA/passkeys decision is documented as deferred or enabled.

## 17. Security exception process

If a baseline control cannot be implemented, record:

1. The control that is missing.
2. The affected data and attack path.
3. The temporary compensating control.
4. The owner responsible for remediation.
5. The target date and acceptance criteria.

Exceptions must be reviewed before every major release and must not silently become permanent architecture.

## 18. Reuse instructions

For a new application:

1. Copy this document into the repository.
2. Replace generic terms with the application’s tenant, role, data, and provider names.
3. Add a route and data-flow inventory.
4. Map every control to code, configuration, tests, or infrastructure.
5. Mark each control as `Implemented`, `Partially implemented`, `Deferred`, or `Not applicable`.
6. Keep the release checklist attached to the deployment process.

This document is a baseline, not a substitute for a product-specific threat model, penetration test, legal review, or provider security review.
