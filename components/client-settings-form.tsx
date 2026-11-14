"use client";

import { useState } from "react";

type ClientSettings = {
  id: string;
  brandMark: string | null;
  brandAccent: string;
  websiteUrl: string | null;
  contactEmail: string | null;
  businessPhone: string | null;
  serviceArea: string | null;
  businessHours: string | null;
  timezone: string;
  hasWebsiteSeo: boolean;
  hasGbpSeo: boolean;
};

export function ClientSettingsForm({ client }: { client: ClientSettings }) {
  const [websiteUrl, setWebsiteUrl] = useState(client.websiteUrl ?? "");
  const [contactEmail, setContactEmail] = useState(client.contactEmail ?? "");
  const [businessPhone, setBusinessPhone] = useState(client.businessPhone ?? "");
  const [serviceArea, setServiceArea] = useState(client.serviceArea ?? "");
  const [businessHours, setBusinessHours] = useState(client.businessHours ?? "");
  const [brandMark, setBrandMark] = useState(client.brandMark ?? "");
  const [brandAccent, setBrandAccent] = useState(client.brandAccent);
  const [timezone, setTimezone] = useState(client.timezone);
  const [hasWebsiteSeo, setHasWebsiteSeo] = useState(client.hasWebsiteSeo);
  const [hasGbpSeo, setHasGbpSeo] = useState(client.hasGbpSeo);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function save() {
    setPending(true);
    setStatus("");
    setError("");
    const response = await fetch(`/api/admin/clients/${client.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ websiteUrl, contactEmail, businessPhone, serviceArea, businessHours, brandMark, brandAccent, timezone, hasWebsiteSeo, hasGbpSeo }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null) as { error?: string } | null;
      setError(body?.error || "We could not save these settings.");
      setPending(false);
      return;
    }

    setStatus("Saved");
    setPending(false);
  }

  return (
    <div className="settings-form">
      <div className="settings-grid">
        <label>Brand mark <span className="label-hint">1–3 letters</span><input value={brandMark} onChange={(event) => setBrandMark(event.target.value.slice(0, 3).toUpperCase())} placeholder="RD" maxLength={3} /></label>
        <label>Accent color <span className="label-hint">used in the client identity</span><span className="color-input"><input type="color" value={brandAccent} onChange={(event) => setBrandAccent(event.target.value)} /><input value={brandAccent} onChange={(event) => setBrandAccent(event.target.value)} pattern="^#[0-9A-Fa-f]{6}$" /></span></label>
        <label>Website URL<input type="url" value={websiteUrl} onChange={(event) => setWebsiteUrl(event.target.value)} placeholder="https://example.com" /></label>
        <label>Contact email<input type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} placeholder="client@example.com" /></label>
        <label>Business phone<input type="tel" value={businessPhone} onChange={(event) => setBusinessPhone(event.target.value)} placeholder="+1 (555) 555-5555" /></label>
        <label>Service area<input value={serviceArea} onChange={(event) => setServiceArea(event.target.value)} placeholder="City, State" /></label>
        <label>Business hours<input value={businessHours} onChange={(event) => setBusinessHours(event.target.value)} placeholder="Mon–Fri, 8:00 AM–6:00 PM" /></label>
        <label>Reporting timezone<select value={timezone} onChange={(event) => setTimezone(event.target.value)}><option>America/New_York</option><option>America/Chicago</option><option>America/Denver</option><option>America/Los_Angeles</option><option>Europe/London</option><option>Asia/Singapore</option></select></label>
      </div>
      <div className="service-options">
        <label className="service-option"><input type="checkbox" checked={hasWebsiteSeo} onChange={(event) => setHasWebsiteSeo(event.target.checked)} /><span><strong>Website SEO</strong><small>Technical, content, and organic search performance</small></span></label>
        <label className="service-option"><input type="checkbox" checked={hasGbpSeo} onChange={(event) => setHasGbpSeo(event.target.checked)} /><span><strong>GBP SEO</strong><small>Local visibility, profile health, and calls</small></span></label>
      </div>
      <div className="form-actions"><span className="save-status">{error || status}</span><button className="button primary" onClick={save} disabled={pending}>{pending ? "Saving…" : "Save project settings"}</button></div>
    </div>
  );
}
