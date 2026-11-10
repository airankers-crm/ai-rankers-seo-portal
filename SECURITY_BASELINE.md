# Web Application Security Standard

**Document type:** Reusable security baseline and review checklist
**Version:** 2.0
**Applies to:** Web applications, portals, dashboards, CRMs, APIs, and SaaS products
**Review frequency:** Before every major release and at least quarterly

## 1. Purpose

This document is a reusable security standard for building and reviewing web applications. It is framework-agnostic so it can be copied into another project and mapped to that project’s routes, data, users, providers, and infrastructure. Each control explains why it is needed, what the application should implement, and how the team should verify it.

The baseline reduces account takeover, data leakage, cross-tenant access, injection, abuse, supply-chain, and recovery risks. It does not replace a product-specific threat model, penetration test, legal review, or cloud-provider security review. Controls may be marked `Implemented`, `Partially implemented`, `Deferred`, or `Not applicable`, but every exception must have an owner and follow-up date.

## 2. Security objectives

The application must:

- Protect accounts, sessions, business data, personal data, provider credentials, and secrets.
- Enforce authorization on the server for every protected page, API route, job, export, and file.
- Keep tenants, workspaces, projects, customers, and provider records isolated.
- Reject unsafe input before it reaches a database, browser, command, file system, or external service.
- Make sensitive changes traceable through reliable audit events.
- Fail closed when authentication, authorization, configuration, or data access is unavailable.
- Detect, contain, investigate, recover from, and learn from security incidents.

## 3. Risk rating model

| Rating | Meaning | Required response |
|---|---|---|
| **Critical** | Likely compromise of the application, credentials, or large-scale data | Block release and remediate immediately |
| **High** | Privilege escalation, tenant breach, account takeover, code execution, or serious data exposure | Fix before production release |
| **Medium** | Limited exposure, abuse, missing defense-in-depth, or material operational risk | Track with an owner and target date |
| **Low** | Hardening, visibility, documentation, or low-impact information disclosure | Resolve during normal maintenance |

## 4. Threat model and system flow

Assume the application will receive unauthenticated traffic, automated abuse, malicious authenticated users, compromised accounts, malformed input, malicious files, forged webhooks, dependency attacks, leaked secrets, stale provider data, and infrastructure failures. The threat model must identify who can act, what data they can reach, which resources they can change, which external services are called, and what happens when a dependency fails.

A typical protected request should follow this flow:

```text
Browser or API client
  → Edge / proxy / WAF
  → Authentication session validation
  → Server-side identity lookup
  → Role and tenant authorization
  → Input and business-rule validation
  → Database or provider operation
  → Audit event and safe response
```

For every major feature, document the trust boundaries, sensitive data, authorization decisions, cache keys, provider calls, and failure states. A visual control, hidden field, route name, or client-side filter is never a security boundary.

## 5. Control catalog

### SEC-01 — Authentication and account lifecycle

**Why it matters:** Authentication is the first boundary protecting every account and tenant. Weak sign-in, recovery, or account-linking logic can allow an attacker to become a legitimate user and bypass otherwise strong authorization. An account that remains active after disablement can continue to access data through existing sessions or direct API calls.

**Implementation standard:** Use a maintained authentication provider or reviewed server-side implementation. Store sessions in Secure, HttpOnly cookies with an intentional SameSite policy, verify email ownership before account linking, expire sessions appropriately, support global sign-out, and disable users server-side. Production must fail closed when required authentication configuration is missing.

**Verification checklist:**

- [ ] Protected pages and APIs reject anonymous requests.
- [ ] Disabled and suspended users cannot use existing protected APIs.
- [ ] Password reset tokens are short-lived, single-use, and never logged.
- [ ] Email ownership is verified before local-account linking.
- [ ] Login, recovery, sign-up, and verification flows are rate-limited.
- [ ] Logout, disablement, expiry, and credential reset invalidate access.

### SEC-02 — MFA and passkeys: future optional phase

**Why it matters:** MFA and passkeys reduce the impact of stolen passwords, especially for administrators. They also require recovery, device enrollment, support, step-up, and lockout decisions, so they should be introduced deliberately rather than as an incomplete login feature. The absence of MFA must be recorded as a known risk when privileged accounts are in scope.

**Baseline decision:** MFA/passkeys are **not required in this baseline**. They are an explicitly deferred future phase. Until enabled, use strong provider authentication, short-lived sessions, re-authentication for sensitive actions, strict role controls, and strong rate limiting.

**Future-phase checklist:**

- [ ] TOTP or authenticator-app support is implemented and tested.
- [ ] WebAuthn/passkey enrollment and recovery are supported.
- [ ] Recovery codes are safely generated, stored, and revocable.
- [ ] Step-up authentication protects role changes, exports, secrets, and billing.
- [ ] Admin enforcement, exceptions, and device/session revocation are documented.

### SEC-03 — Authorization, RBAC, and least privilege

**Why it matters:** A valid login does not prove that a user should access a particular record or action. Authorization failures are a common cause of customer-data exposure because attackers can call APIs directly even when a UI hides a control. Role names should represent permissions, not merely navigation labels.

**Implementation standard:** Use deny-by-default, server-side authorization for every page, API route, job, export, and file. Separate super-admin, administrator, tenant administrator, standard client, read-only, and support permissions. Only an explicitly authorized role may grant roles, disable accounts, change tenant assignments, publish data, or alter security settings.

**Verification checklist:**

- [ ] Every protected route performs a server-side permission check.
- [ ] The browser cannot choose the acting user, role, or privilege.
- [ ] Ordinary admins cannot grant equal or higher privileges without approval.
- [ ] The last privileged account cannot be accidentally removed.
- [ ] Sensitive mutations require re-authentication where appropriate.
- [ ] Permission tests cover direct API calls, not only UI clicks.

### SEC-04 — Tenant and resource isolation

**Why it matters:** One missing tenant condition can expose an entire customer base. Resource IDs, client IDs, workspace IDs, and assignee IDs supplied by the browser must never be trusted without server-side ownership validation. Tenant status also matters: paused or archived workspaces should not continue to use active client APIs.

**Implementation standard:** Resolve the tenant from the authenticated server-side identity and verify every requested resource belongs to that tenant. Validate relationships such as task assignees, files, goals, conversations, metrics, reports, and provider records. Apply tenant scope to reads, writes, exports, jobs, cache keys, audit records, and storage paths.

**Verification checklist:**

- [ ] A user cannot read another tenant by changing an ID.
- [ ] A user cannot update or delete another tenant’s records.
- [ ] Paused, archived, and deleted tenants are blocked according to policy.
- [ ] Related records are checked for the same tenant.
- [ ] Cache keys and revalidation tags include tenant scope.
- [ ] Cross-tenant tests cover every resource type.

### SEC-05 — Input validation and business rules

**Why it matters:** Input can reach databases, browsers, logs, providers, files, and business workflows. Type checking alone does not prevent oversized payloads, unsafe URLs, duplicate operations, invalid state transitions, or privilege-changing fields. Validation must happen on the server because client-side validation can be bypassed.

**Implementation standard:** Validate request bodies with explicit schemas and enforce type, length, enum, range, date, ownership, and state-transition rules. Reject unknown fields where practical. Normalize values once at the server boundary and do not silently reinterpret unsafe input into another reachable form.

**Verification checklist:**

- [ ] Empty, oversized, malformed, and unexpected fields are rejected.
- [ ] Enum and state-transition values are allowlisted.
- [ ] Dates, numbers, percentages, currencies, and IDs are validated.
- [ ] Business rules are enforced on the server.
- [ ] Errors do not reveal secrets, SQL, stack traces, or internal paths.
- [ ] Tests cover malicious and nearest-valid inputs.

### SEC-06 — SQL injection, command injection, and unsafe execution

**Why it matters:** Injection can turn a normal request into database reads, data modification, server commands, or remote code execution. ORM usage reduces risk but does not make unsafe raw SQL or shell execution safe automatically. Dynamic filters, reporting queries, exports, and administrative tools are common injection boundaries.

**Implementation standard:** Use parameterized ORM methods or tagged SQL for all values. Never concatenate SQL, shell commands, file paths, HTML, JavaScript, or regular expressions from user input. Avoid runtime code evaluation and restrict diagnostic tools to trusted server-side operations.

**Verification checklist:**

- [ ] No concatenated SQL uses attacker-controlled values.
- [ ] Unsafe raw-query APIs are prohibited or reviewed.
- [ ] No user input reaches shell execution or dynamic code evaluation.
- [ ] Sort and filter fields use server-side allowlists.
- [ ] Database credentials have least privilege.
- [ ] Injection tests cover search, filters, exports, and admin tools.

### SEC-07 — XSS, HTML, and browser output safety

**Why it matters:** Stored XSS is dangerous in portals and CRMs because malicious content may be shown to administrators or other customers later. Normal text escaping does not protect raw HTML, rich-text editors, SVG, URLs, style values, or third-party widgets. CSP reduces the impact when an output mistake occurs.

**Implementation standard:** Render user content as text by default. If rich text is required, sanitize it with a strict allowlist and remove scripts, event handlers, dangerous URLs, and unsafe embeds. Validate URL schemes and revalidate persisted content at render time. Add CSP and frame protection.

**Verification checklist:**

- [ ] Unnecessary raw HTML rendering is absent.
- [ ] Rich text is sanitized server-side and client-side as appropriate.
- [ ] `javascript:`, `data:`, `vbscript:`, and similar schemes are rejected.
- [ ] Stored content is revalidated when returned or rendered.
- [ ] CSP and frame protections are present in production.
- [ ] Tests cover stored, reflected, DOM, URL, and HTML contexts.

### SEC-08 — CSRF, Origin, and cookie protection

**Why it matters:** Cookie-authenticated browsers automatically attach session cookies. Without CSRF protection, a malicious website may cause a signed-in user to perform an unwanted action. SameSite cookies reduce some attacks but should not be the only application guarantee.

**Implementation standard:** Require a trusted Origin for state-changing application requests and use Referer only as a controlled fallback. Add a synchronizer or double-submit token where Origin checks are insufficient. Exempt only documented provider callbacks with their own verification.

**Verification checklist:**

- [ ] Missing Origin and Referer are rejected for protected mutations.
- [ ] Foreign Origin and malformed Referer are rejected.
- [ ] Valid same-origin mutations continue to work.
- [ ] Provider callbacks are separately verified.
- [ ] Cookie flags are confirmed in deployed responses.
- [ ] CSRF tests cover account, admin, chat, tasks, invites, and publishing.

### SEC-09 — Security headers and transport protection

**Why it matters:** Headers provide defense-in-depth against framing, MIME confusion, referrer leakage, unsafe browser capabilities, and script-injection consequences. They are easy to omit when configured only in individual pages. Headers must be checked on successful pages, redirects, errors, and APIs where relevant.

**Implementation standard:** Configure CSP, HSTS for HTTPS production, `X-Content-Type-Options: nosniff`, frame protection, Referrer-Policy, and Permissions-Policy. Start with a restrictive CSP and document exceptions such as inline styles or provider connections. Verify headers at the deployed edge, including proxy-generated responses.

**Verification checklist:**

- [ ] CSP is present and has no unnecessary wildcards.
- [ ] HSTS is enabled only where HTTPS is guaranteed.
- [ ] `nosniff`, frame protection, Referrer-Policy, and Permissions-Policy are present.
- [ ] Authentication and error responses receive appropriate headers.
- [ ] CSP reports or browser console errors are reviewed after deployment.

### SEC-10 — Rate limiting and abuse prevention

**Why it matters:** Authorization can be correct while an endpoint is still abused. Repeated requests can cause account takeover, spam, database exhaustion, unexpected provider costs, or duplicate records. Serverless systems cannot rely on process-local counters.

**Implementation standard:** Use edge/WAF limits by IP and route, authenticated limits by user and tenant, and business limits for expensive operations. Cover login, recovery, invitations, onboarding, chat, feedback, tasks, exports, admin changes, sync, and webhook retries. Return `429` with a safe retry value and avoid revealing whether sensitive accounts exist.

**Verification checklist:**

- [ ] Authentication and recovery have limits.
- [ ] Expensive and high-volume actions have limits.
- [ ] Limits work across instances and regions.
- [ ] Limits cannot be bypassed by changing a browser field.
- [ ] Alerts exist for spikes, repeated failures, and provider errors.

### SEC-11 — Files, links, and attachments

**Why it matters:** Files and links can deliver phishing, malware, data leakage, and cross-tenant access. A URL that is merely parseable may still use a dangerous scheme, point to an internal address, or redirect to an untrusted destination. Public storage URLs can remain accessible after permission changes.

**Implementation standard:** Prefer private object storage with short-lived signed upload and download URLs. Validate size, extension, detected content type, destination policy, and tenant ownership; scan uploads before availability. Never expose storage credentials or fetch arbitrary user URLs from the server without SSRF protections.

**Verification checklist:**

- [ ] Unsafe schemes and credential-bearing URLs are rejected.
- [ ] Upload limits exist for size, type, count, and frequency.
- [ ] Files are private and accessed through authorization checks.
- [ ] Malware scanning is enabled where files are accepted.
- [ ] Cross-tenant file access is denied.
- [ ] File upload, download, sharing, and deletion are audited.

### SEC-12 — Database, cache, and data protection

**Why it matters:** The database is the authoritative source for customer and operational data. A leaked connection string, powerful database role, unscoped cache key, or partial transaction can cause broad exposure or inconsistent business state. Database security must cover confidentiality and correctness.

**Implementation standard:** Keep credentials server-side, use least-privilege roles, encrypt connections and storage, enforce foreign keys, and add tenant-scoped indexes. Use transactions for linked changes and conditional updates for one-time actions. Include tenant identity in cache keys and never publicly cache personalized responses.

**Verification checklist:**

- [ ] Credentials are not in source or client bundles.
- [ ] Runtime and migration credentials are separated where possible.
- [ ] Sensitive writes and audit records use transactions.
- [ ] Cache entries cannot cross tenants or users.
- [ ] PII is minimized in responses and logs.
- [ ] Retention, export, correction, and deletion are documented.

### SEC-13 — OAuth, provider credentials, APIs, and webhooks

**Why it matters:** Integrations may provide access to analytics, listings, CRM records, calls, and customer data. A stolen refresh token or forged webhook can create long-lived access or corrupt trusted metrics. Provider failures can also make stale data appear current.

**Implementation standard:** Store provider tokens encrypted or in a managed vault, request narrow scopes, and never expose refresh tokens to clients. Verify webhook signatures, timestamps, event IDs, and idempotency keys. Record sync freshness, attempts, warnings, retries, affected metrics, and provider errors without exposing provider secrets.

**Verification checklist:**

- [ ] OAuth state and redirect destinations are validated.
- [ ] Scopes are minimized and credentials can be revoked.
- [ ] Webhook signatures and replay windows are enforced.
- [ ] Repeated events are idempotent.
- [ ] Stale data and sync failures are visible to operators.
- [ ] Client screens distinguish live, delayed, preview, and overridden data.

### SEC-14 — Invitations, onboarding, and account linking

**Why it matters:** These flows create membership and assign tenant access. A race condition, reusable token, wrong email check, or unrestricted self-service path can grant access to the wrong workspace. They must be treated as privileged state transitions.

**Implementation standard:** Use high-entropy, hashed, short-lived, single-use invitation tokens. Check verified email ownership, tenant status, intended role, current membership, and expiry. Claim invitations with an atomic conditional update and keep membership changes plus audit events in one transaction. Rate-limit invitation creation, acceptance, and workspace creation.

**Verification checklist:**

- [ ] Tokens use cryptographically secure randomness.
- [ ] Only token hashes are stored.
- [ ] Tokens expire and cannot be accepted twice.
- [ ] Signed-in email matches the invitation email.
- [ ] Invitations cannot assign unsupported privileged roles.
- [ ] Paused or archived tenants cannot receive or accept active access.
- [ ] Concurrent acceptance and onboarding requests are safe.

### SEC-15 — Audit logging and security monitoring

**Why it matters:** Without trustworthy audit events, the team cannot determine who changed access, published data, exported records, or connected a provider. Logs support incident response, customer questions, and compliance evidence. They must be useful without becoming a second source of secret leakage.

**Implementation standard:** Record authentication failures, account linking, role changes, tenant assignment, invitation lifecycle, provider changes, file access, exports, publication, and security configuration changes. Include actor, tenant, action, resource, timestamp, request ID, and safe before/after context. Restrict log access and define retention.

**Verification checklist:**

- [ ] Sensitive changes create audit events.
- [ ] Audit creation is transactional where required.
- [ ] Events contain actor, tenant, resource, timestamp, and request ID.
- [ ] Passwords, tokens, cookies, and unnecessary PII are never logged.
- [ ] Alerts exist for repeated failures, privilege changes, and unusual exports.

### SEC-16 — Secrets and environment management

**Why it matters:** A secret in Git history, a preview deployment, a browser bundle, or a build log can provide direct production access. Environment confusion is dangerous when preview data and production credentials are mixed. Secret management must be designed before integrations are connected.

**Implementation standard:** Never commit secrets or `.env` files. Use separate local, preview, staging, and production credentials with managed secret storage. Rotate secrets after suspected exposure and use short-lived or scoped credentials. Configure canonical origin, production authentication, database URLs, provider credentials, and logging destinations per environment.

**Verification checklist:**

- [ ] Secret scanning runs in CI and pull requests.
- [ ] No secrets appear in Git history, source, logs, or client bundles.
- [ ] Preview cannot unintentionally access production data.
- [ ] Credentials have owners, rotation rules, and minimum scope.
- [ ] Production fails closed when required secrets are missing.
- [ ] Rotation and revocation procedures are tested.

### SEC-17 — Dependencies, CI/CD, and supply-chain security

**Why it matters:** Vulnerable or compromised dependencies can bypass application controls before application code runs. A secure local build is not enough if pull requests merge without dependency, type, test, or secret checks. CI actions and build tools also execute with repository privileges and must be treated as code.

**Implementation standard:** Use frozen lockfile installation, production dependency auditing, dependency review, secret scanning, SAST where appropriate, typecheck, lint, tests, schema validation, migration checks, and production builds. Protect the default branch and require security checks before merge. Review third-party packages and actions for provenance, maintenance, permissions, and known vulnerabilities.

**Verification checklist:**

- [ ] Frozen lockfile installation runs in CI.
- [ ] Production dependency audit runs on protected changes.
- [ ] Pull request dependency review is enabled.
- [ ] Secret scanning is enabled.
- [ ] Authorization and tenant-isolation tests run in CI.
- [ ] CI has least-privilege permissions.
- [ ] Deployment uses the exact commit that passed checks.

### SEC-18 — Deployment, infrastructure, and observability

**Why it matters:** Secure code can still be exposed through permissive deployment settings, public preview data, missing TLS, verbose errors, or unmonitored failures. Infrastructure controls must cover the edge, runtime, database, storage, logs, and deployment process. Configuration drift is a security issue, not only an operations issue.

**Implementation standard:** Enforce HTTPS, protected production deployments, restricted administration, safe previews, least-privilege service accounts, and monitored runtime errors. Keep migrations separate from normal builds where appropriate. Sanitize production errors, use request IDs, and monitor authentication, authorization, database, provider, and rate-limit failures.

**Verification checklist:**

- [ ] Production and preview environments are separated.
- [ ] TLS, domains, deployment protection, and access policies are reviewed.
- [ ] Runtime logs do not contain secrets or full sensitive payloads.
- [ ] Errors expose safe messages and a request ID.
- [ ] Migrations run from a trusted process.
- [ ] Monitoring and alerts cover security-relevant failures.

### SEC-19 — Backups, recovery, and incident response

**Why it matters:** Prevention cannot guarantee that a breach, deletion, provider failure, or operational mistake will never happen. Recovery controls determine whether the business can restore trustworthy data and continue serving customers. A backup that has never been restored is not proven.

**Implementation standard:** Enable automated backups and point-in-time recovery where supported. Define recovery point and recovery time objectives, test restoration in isolation, and document credential rotation, account disablement, data exposure, provider compromise, and customer notification procedures. Preserve relevant logs and timelines during incidents.

**Verification checklist:**

- [ ] Backup frequency and retention are documented.
- [ ] Restore tests run on a defined schedule.
- [ ] Recovery objectives are approved.
- [ ] Incident contacts and escalation paths are current.
- [ ] Credential rotation and emergency access are tested.
- [ ] Post-incident reviews produce tracked corrective actions.

### SEC-20 — Privacy, retention, and customer data handling

**Why it matters:** Security includes controlling what data is collected, where it is stored, who can access it, and when it is deleted. Unnecessary personal data increases breach impact and support burden. Customers and operators need clear boundaries around reports, exports, messages, files, analytics, and provider data.

**Implementation standard:** Minimize data collection, classify sensitive fields, define retention periods, restrict exports, and provide correction/deletion workflows where required. Mask or redact PII in logs and analytics. Document data processors, regions, provider access, customer-visible data, and deletion behavior for disabled or terminated tenants.

**Verification checklist:**

- [ ] Data classification exists for sensitive records.
- [ ] Retention and deletion rules are implemented or tracked.
- [ ] Exports are authorized, logged, and time-limited.
- [ ] Logs and analytics minimize personal data.
- [ ] Tenant termination and user deletion behavior is documented.
- [ ] Privacy and legal requirements are reviewed for the deployment region.

## 6. Required security test matrix

| Area | Required test |
|---|---|
| Authentication | Anonymous request cannot access protected page or API |
| Session | Logout, disablement, expiry, and reset invalidate access |
| Authorization | Lower role cannot perform higher-role action |
| Tenant isolation | User cannot read or modify another tenant by changing an ID |
| Input validation | Malformed, oversized, unknown, and invalid enum input is rejected |
| Injection | Search, filters, reports, exports, and admin tools resist injection |
| XSS | Stored and reflected payloads render as text or are sanitized |
| URL safety | Dangerous schemes and credential-bearing URLs are rejected |
| CSRF | Missing and foreign Origin requests are rejected |
| Rate limiting | Repeated requests receive `429` without data leakage |
| Files | Unauthorized, oversized, unsupported, and malicious files are blocked |
| Webhooks | Invalid signatures, old timestamps, and replayed events are rejected |
| Audit | Sensitive changes create complete, safe audit events |
| Recovery | Backup restore produces usable, authorized data |

## 7. Production release checklist

### Identity and access

- [ ] Production authentication is configured and fails closed when required variables are missing.
- [ ] Protected pages, APIs, jobs, exports, and files enforce server-side authorization.
- [ ] Role changes, tenant assignment, and account disablement are restricted and audited.
- [ ] Client, workspace, project, and provider records are tenant-scoped.
- [ ] MFA/passkeys are explicitly documented as `Deferred` or `Implemented`.

### Browser and API protection

- [ ] State-changing requests enforce Origin/CSRF protection.
- [ ] Cookies have intentional Secure, HttpOnly, and SameSite settings.
- [ ] CSP, HSTS, frame protection, `nosniff`, Referrer-Policy, and Permissions-Policy are verified.
- [ ] User content is escaped or sanitized.
- [ ] Unsafe URL schemes, HTML, files, and commands are rejected.

### Abuse and data protection

- [ ] Rate limits cover authentication, recovery, onboarding, invitations, chat, exports, and admin actions.
- [ ] Private files use authorization and short-lived signed URLs.
- [ ] Provider credentials are encrypted, scoped, revocable, and never client-visible.
- [ ] Webhooks are authenticated, timestamped, idempotent, and replay-resistant.
- [ ] Sensitive data is minimized, retained, exported, and deleted according to policy.

### Code and delivery

- [ ] No secrets are committed, logged, or included in client bundles.
- [ ] Dependency audit reports no unresolved critical or high vulnerabilities.
- [ ] Pull request dependency review and secret scanning are enabled.
- [ ] Typecheck, lint, tests, schema validation, migration checks, and production build pass.
- [ ] The deployed artifact matches the verified commit.

### Operations and recovery

- [ ] Monitoring and alerts cover authentication, authorization, database, provider, and rate-limit failures.
- [ ] Backups and point-in-time recovery are enabled where required.
- [ ] Restore testing has been completed recently.
- [ ] Incident contacts, escalation paths, and credential-rotation procedures are current.
- [ ] Security exceptions have owners, compensating controls, and review dates.

## 8. Security review record template

Copy this table into each project’s security review:

| Control ID | Status | Evidence | Owner | Target date | Notes |
|---|---|---|---|---|---|
| SEC-01 to SEC-05 | Implemented / Partial / Deferred / N/A | Code, test, or configuration link | Name | Date | Risk or exception |
| SEC-06 to SEC-10 | Implemented / Partial / Deferred / N/A | Code, test, or configuration link | Name | Date | Risk or exception |
| SEC-11 to SEC-15 | Implemented / Partial / Deferred / N/A | Code, test, or configuration link | Name | Date | Risk or exception |
| SEC-16 to SEC-20 | Implemented / Partial / Deferred / N/A | Code, test, or configuration link | Name | Date | Risk or exception |

## 9. Security exception process

If a baseline control cannot be implemented, record the control, affected data, attack path, temporary compensating control, owner, target date, and acceptance criteria. Exceptions must be approved by the responsible product and engineering owners before release. Review every exception before each major release so that a temporary compromise does not become permanent architecture.

## 10. Reuse instructions

For a new application:

1. Copy this document into the repository.
2. Replace generic terms with the application’s tenant, role, data, provider, and deployment names.
3. Add a route, data-flow, provider, and trust-boundary inventory.
4. Map every control to code, configuration, infrastructure, and tests.
5. Complete the security review record and release checklist.
6. Mark every control as `Implemented`, `Partially implemented`, `Deferred`, or `Not applicable`.
7. Attach evidence links for tests, scans, configuration, and production verification.

This standard is a reusable baseline. It must be supplemented by a product-specific threat model and, for higher-risk systems, an independent penetration test and formal security review.
