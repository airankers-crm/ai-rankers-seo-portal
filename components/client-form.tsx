"use client";

import Link from "next/link";
import { ArrowLeft, Building2, CheckCircle2, Globe2, Loader2, Mail, Rocket, ShieldCheck, Sparkles } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type FormErrors = {
  businessName?: string;
  websiteUrl?: string;
  contactEmail?: string;
  form?: string;
};

function initialsFor(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "CL";
  return parts.slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function isSafeWebsiteUrl(value: string) {
  try {
    const parsed = new URL(value);
    return (parsed.protocol === "http:" || parsed.protocol === "https:") && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
}

export function ClientForm() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [pending, setPending] = useState(false);
  const previewInitials = useMemo(() => initialsFor(businessName), [businessName]);

  function clearError(field: keyof FormErrors) {
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function validate() {
    const nextErrors: FormErrors = {};
    const normalizedName = businessName.trim();
    const normalizedWebsite = websiteUrl.trim();
    const normalizedEmail = contactEmail.trim();

    if (!normalizedName) nextErrors.businessName = "Enter the business name.";
    else if (normalizedName.length < 2) nextErrors.businessName = "Use at least 2 characters.";
    else if (normalizedName.length > 120) nextErrors.businessName = "Keep the business name under 120 characters.";

    if (normalizedWebsite && !isSafeWebsiteUrl(normalizedWebsite)) nextErrors.websiteUrl = "Use a valid http or https URL.";
    if (normalizedEmail && !/^\S+@\S+\.\S+$/.test(normalizedEmail)) nextErrors.contactEmail = "Enter a valid email address.";

    return nextErrors;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length || pending) return;

    setPending(true);
    try {
      const response = await fetch("/api/admin/clients", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ businessName: businessName.trim(), websiteUrl: websiteUrl.trim(), contactEmail: contactEmail.trim() }),
      });
      const body = await response.json().catch(() => null) as { error?: string; id?: string } | null;
      if (!response.ok || !body?.id) {
        setErrors({ form: body?.error || "We could not create this client workspace. Try again." });
        return;
      }

      router.push(`/admin/clients/${body.id}`);
      router.refresh();
    } catch {
      setErrors({ form: "We could not reach the workspace service. Check your connection and try again." });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="content new-client-page">
      <Link className="back-link" href="/admin/clients"><ArrowLeft size={13} /> Back to client workspaces</Link>
      <div className="new-client-page-heading">
        <div>
          <p className="eyebrow">Client workspace · Step 1 of 7</p>
          <h1>Create a client workspace</h1>
          <p>Start with the essentials. You can connect reporting sources, add goals, and invite the client after the workspace is created.</p>
        </div>
        <span className="new-client-heading-status"><span /> Draft setup</span>
      </div>

      <div className="new-client-layout">
        <section className="card new-client-form-card" aria-labelledby="new-client-form-title">
          <div className="new-client-card-heading">
            <span className="new-client-card-icon"><Building2 size={18} /></span>
            <div><p className="eyebrow">Workspace identity</p><h2 id="new-client-form-title">Add the business details</h2><p>These details identify the workspace in the admin area and client portal.</p></div>
            <span className="new-client-required-note"><span>*</span> Required</span>
          </div>

          <form className="new-client-form" onSubmit={submit} noValidate>
            <div className="new-client-field new-client-field-wide">
              <label htmlFor="new-client-business-name">Business name <span>Required</span></label>
              <div className={`new-client-input ${errors.businessName ? "has-error" : ""}`}><Building2 size={16} aria-hidden="true" /><input id="new-client-business-name" value={businessName} onChange={(event) => { setBusinessName(event.target.value); clearError("businessName"); }} placeholder="Tony Roofing" maxLength={120} autoComplete="organization" aria-invalid={Boolean(errors.businessName)} aria-describedby={errors.businessName ? "new-client-business-name-error" : "new-client-business-name-help"} /></div>
              {errors.businessName ? <small className="new-client-field-error" id="new-client-business-name-error" role="alert">{errors.businessName}</small> : <small id="new-client-business-name-help">Use the client-facing business name, not an internal nickname.</small>}
            </div>

            <div className="new-client-field-grid">
              <div className="new-client-field">
                <label htmlFor="new-client-website">Website URL <span>Optional</span></label>
                <div className={`new-client-input ${errors.websiteUrl ? "has-error" : ""}`}><Globe2 size={16} aria-hidden="true" /><input id="new-client-website" type="url" value={websiteUrl} onChange={(event) => { setWebsiteUrl(event.target.value); clearError("websiteUrl"); }} placeholder="https://example.com" autoComplete="url" aria-invalid={Boolean(errors.websiteUrl)} aria-describedby={errors.websiteUrl ? "new-client-website-error" : "new-client-website-help"} /></div>
                {errors.websiteUrl ? <small className="new-client-field-error" id="new-client-website-error" role="alert">{errors.websiteUrl}</small> : <small id="new-client-website-help">Used for workspace context and future source connections.</small>}
              </div>
              <div className="new-client-field">
                <label htmlFor="new-client-contact-email">Primary contact email <span>Optional</span></label>
                <div className={`new-client-input ${errors.contactEmail ? "has-error" : ""}`}><Mail size={16} aria-hidden="true" /><input id="new-client-contact-email" type="email" value={contactEmail} onChange={(event) => { setContactEmail(event.target.value); clearError("contactEmail"); }} placeholder="client@example.com" autoComplete="email" aria-invalid={Boolean(errors.contactEmail)} aria-describedby={errors.contactEmail ? "new-client-contact-email-error" : "new-client-contact-email-help"} /></div>
                {errors.contactEmail ? <small className="new-client-field-error" id="new-client-contact-email-error" role="alert">{errors.contactEmail}</small> : <small id="new-client-contact-email-help">You can add or change this later before sending an invite.</small>}
              </div>
            </div>

            {errors.form ? <p className="new-client-form-error" role="alert">{errors.form}</p> : null}
            <div className="new-client-form-divider" />
            <div className="new-client-actions"><Link className="button" href="/admin/clients">Cancel</Link><button className="button primary" type="submit" disabled={pending}>{pending ? <><Loader2 size={14} className="spin" /> Creating workspace…</> : <><Rocket size={14} /> Create workspace</>}</button></div>
          </form>
        </section>

        <aside className="new-client-side" aria-label="New workspace guidance">
          <section className="card new-client-next-card">
            <div className="new-client-side-heading"><span className="new-client-side-icon purple"><Sparkles size={16} /></span><div><p className="eyebrow">After creation</p><h2>Build the workspace in stages</h2></div></div>
            <ol className="new-client-next-list">
              <li><span>1</span><div><strong>Confirm the business profile</strong><small>Add phone, service area, hours, and branding.</small></div></li>
              <li><span>2</span><div><strong>Prepare reporting screens</strong><small>Connect Google APIs or import approved Excel data.</small></div></li>
              <li><span>3</span><div><strong>Review, publish, and invite</strong><small>Client access stays off until the portal is approved.</small></div></li>
            </ol>
            <div className="new-client-safe-note"><ShieldCheck size={15} /><span>New workspaces begin as admin-only drafts.</span></div>
          </section>

          <section className="card new-client-preview-card">
            <div className="new-client-side-heading"><span className="new-client-side-icon teal"><CheckCircle2 size={16} /></span><div><p className="eyebrow">Portal preview</p><h2>Client identity</h2></div></div>
            <div className="new-client-preview"><span>{previewInitials}</span><div><strong>{businessName.trim() || "Your client name"}</strong><small>Client portal</small></div><em>Draft</em></div>
            <p>The client will see this identity after you publish the approved workspace.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
