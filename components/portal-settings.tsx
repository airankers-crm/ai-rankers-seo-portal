"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Bell, Building2, Check, ChevronRight, ExternalLink, Globe2, Link2, LockKeyhole, MapPin, MessageCircle, Monitor, Palette, RefreshCw, ShieldCheck, UserRound } from "lucide-react";
import { AppShell } from "./app-shell";

type PortalSettingsProps = {
  clientName: string;
  brandMark?: string | null;
  brandAccent?: string | null;
  clientTimezone: string;
  websiteUrl?: string | null;
  contactEmail?: string | null;
  businessPhone?: string | null;
  serviceArea?: string | null;
  businessHours?: string | null;
  hasGbpSeo: boolean;
  userName: string;
  userEmail: string;
  canEditProfile: boolean;
};

type Notice = { kind: "success" | "error"; text: string } | null;

const preferenceDefaults = {
  reportUpdates: true,
  taskUpdates: true,
  teamMessages: true,
};

function Toggle({ checked, label, description, onChange }: { checked: boolean; label: string; description: string; onChange: () => void }) {
  return (
    <button className="portal-setting-toggle" type="button" role="switch" aria-checked={checked} onClick={onChange}>
      <span className={`portal-toggle-track${checked ? " is-on" : ""}`}><span /></span>
      <span className="portal-setting-toggle-copy"><strong>{label}</strong><small>{description}</small></span>
    </button>
  );
}

export function PortalSettings({ clientName, brandMark, brandAccent, clientTimezone, websiteUrl, contactEmail, businessPhone, serviceArea, businessHours, hasGbpSeo, userName, userEmail, canEditProfile }: PortalSettingsProps) {
  const [name, setName] = useState(userName);
  const [savingName, setSavingName] = useState(false);
  const [profileNotice, setProfileNotice] = useState<Notice>(null);
  const preferenceKey = `portal-preferences:${userEmail || clientName}`;
  const [preferences, setPreferences] = useState(() => {
    try {
      const stored = window.localStorage.getItem(preferenceKey);
      return stored ? { ...preferenceDefaults, ...JSON.parse(stored) } : preferenceDefaults;
    } catch {
      // Preferences remain at their safe defaults when browser storage is unavailable.
      return preferenceDefaults;
    }
  });
  const [preferenceNotice, setPreferenceNotice] = useState<Notice>(null);

  function updatePreference(key: keyof typeof preferenceDefaults) {
    const next = { ...preferences, [key]: !preferences[key] };
    setPreferences(next);
    try {
      window.localStorage.setItem(preferenceKey, JSON.stringify(next));
      setPreferenceNotice({ kind: "success", text: "Notification preferences saved on this device." });
    } catch {
      setPreferenceNotice({ kind: "error", text: "Your browser blocked local preference storage." });
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canEditProfile) {
      setProfileNotice({ kind: "success", text: "Preview mode: profile changes are not connected to an account." });
      return;
    }
    setSavingName(true);
    setProfileNotice(null);
    const response = await fetch("/api/portal/account", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) });
    const body = await response.json().catch(() => null) as { error?: string } | null;
    setSavingName(false);
    setProfileNotice(response.ok ? { kind: "success", text: "Profile updated successfully." } : { kind: "error", text: body?.error ?? "We could not update your profile." });
  }

  return (
    <AppShell mode="portal" clientName={clientName} brandMark={brandMark ?? undefined} brandAccent={brandAccent ?? undefined} activeNav="Settings">
      <div className="content portal-settings-page">
        <div className="page-heading portal-settings-heading">
          <div>
            <p className="eyebrow">Client portal / Account</p>
            <h1>Settings</h1>
            <p>Manage your profile and how the {clientName} portal keeps you informed.</p>
          </div>
          <div className="portal-settings-heading-status"><span className="status-dot" /> Workspace connected</div>
        </div>

        <nav className="portal-settings-section-nav" aria-label="Settings sections">
          <a href="#business">Business information</a>
          <a href="#gbp">Google Business Profile</a>
          <a href="#profile">Your profile</a>
          <a href="#notifications">Notifications</a>
          <a href="#display">Display preferences</a>
          <a href="#security">Security</a>
          <a href="#workspace-access">Workspace access</a>
        </nav>

        <section className="portal-settings-intro card">
          <div className="portal-settings-intro-icon"><ShieldCheck size={20} /></div>
          <div><strong>Your client workspace is secure</strong><p>These settings apply to your portal account only. Reporting data, integrations, and what is published are managed by your agency team.</p></div>
        </section>

        <div className="portal-settings-layout">
          <div className="portal-settings-main">
            <section className="card portal-settings-card" id="business" aria-labelledby="business-title">
              <div className="portal-settings-card-heading"><div className="portal-settings-card-icon business"><Building2 size={17} /></div><div><h2 id="business-title">Business information</h2><p>Review the business details used across your client portal and reports.</p></div></div>
              <div className="portal-settings-detail-grid">
                <div><span>Business name</span><strong>{clientName}</strong></div>
                <div><span>Website</span><strong>{websiteUrl ? <a href={websiteUrl} target="_blank" rel="noreferrer">{websiteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")} <ExternalLink size={11} /></a> : "Not provided"}</strong></div>
                <div><span>Contact email</span><strong>{contactEmail || "Not provided"}</strong></div>
                <div><span>Phone</span><strong>{businessPhone || "Not provided"}</strong></div>
                <div><span>Service area</span><strong>{serviceArea || "Not provided"}</strong></div>
                <div><span>Business hours</span><strong>{businessHours || "Not provided"}</strong></div>
                <div><span>Reporting timezone</span><strong>{clientTimezone.replace("_", " ")}</strong></div>
              </div>
              <div className="portal-settings-inline-note"><ShieldCheck size={13} /><span>Business identity changes are managed by the AI Rankers team so reports stay consistent.</span><Link href="/portal/feedback">Request an update <ChevronRight size={12} /></Link></div>
            </section>

            <section className="card portal-settings-card" id="gbp" aria-labelledby="gbp-title">
              <div className="portal-settings-card-heading"><div className="portal-settings-card-icon gbp"><Globe2 size={17} /></div><div><h2 id="gbp-title">Google Business Profile</h2><p>Check the profile connection used for local visibility reporting.</p></div></div>
              <div className="portal-settings-integration-head"><div className="portal-settings-integration-name"><span className="portal-settings-provider-icon"><Globe2 size={16} /></span><div><strong>Google Business Profile</strong><small>{hasGbpSeo ? "Enabled for this workspace" : "Not enabled for this workspace"}</small></div></div><span className={`portal-settings-badge${hasGbpSeo ? "" : " is-muted"}`}><span className="status-dot" /> {hasGbpSeo ? "Configured" : "Not configured"}</span></div>
              <div className="portal-settings-detail-grid portal-settings-integration-grid">
                <div><span><Link2 size={11} /> Connection</span><strong>{hasGbpSeo ? "Managed by your agency" : "Awaiting setup"}</strong></div>
                <div><span><MapPin size={11} /> Profile location</span><strong>{clientName}</strong></div>
                <div><span><RefreshCw size={11} /> Data sync</span><strong>{hasGbpSeo ? "Agency-managed sync" : "Not connected"}</strong></div>
                <div><span><ShieldCheck size={11} /> Account access</span><strong>Securely managed</strong></div>
              </div>
              <div className="portal-settings-integration-footer"><span>Need to change the connected account or location?</span><Link className="portal-settings-side-link" href="/portal/feedback">Contact AI Rankers <ChevronRight size={14} /></Link>{hasGbpSeo ? <Link className="button" href="/portal/gbp">View GBP performance <ChevronRight size={13} /></Link> : null}</div>
            </section>

            <section className="card portal-settings-card" id="profile" aria-labelledby="profile-title">
              <div className="portal-settings-card-heading"><div className="portal-settings-card-icon profile"><UserRound size={17} /></div><div><h2 id="profile-title">Your profile</h2><p>Update the name your agency team sees when you communicate.</p></div></div>
              <form className="portal-settings-form" onSubmit={saveProfile}>
                <div className="portal-settings-form-grid">
                  <label>Full name<input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" disabled={!canEditProfile} /></label>
                  <label>Email address<span className="label-hint">Managed by your sign-in</span><input value={userEmail || "Not available"} readOnly /></label>
                  <label>Client workspace<span className="label-hint">Assigned by your agency</span><input value={clientName} readOnly /></label>
                  <label>Reporting timezone<span className="label-hint">Used for report periods</span><input value={clientTimezone.replace("_", " ")} readOnly /></label>
                </div>
                {profileNotice ? <p className={profileNotice.kind === "error" ? "auth-error" : "auth-success"} role="status">{profileNotice.text}</p> : null}
                <div className="portal-settings-form-footer"><span className="portal-settings-readonly"><LockKeyhole size={12} /> Email and workspace access are controlled securely.</span><button className="button primary" type="submit" disabled={savingName}>{savingName ? "Saving…" : "Save profile"}</button></div>
              </form>
            </section>

            <section className="card portal-settings-card" id="notifications" aria-labelledby="notifications-title">
              <div className="portal-settings-card-heading"><div className="portal-settings-card-icon notifications"><Bell size={17} /></div><div><h2 id="notifications-title">Notifications</h2><p>Choose which portal updates should be highlighted for you.</p></div></div>
              <div className="portal-setting-list">
                <Toggle checked={preferences.reportUpdates} label="Report updates" description="Know when a new monthly report is published." onChange={() => updatePreference("reportUpdates")} />
                <Toggle checked={preferences.taskUpdates} label="Activity and task updates" description="Get notified when work is completed or needs your attention." onChange={() => updatePreference("taskUpdates")} />
              </div>
              {preferenceNotice ? <p className={preferenceNotice.kind === "error" ? "auth-error" : "auth-success"} role="status">{preferenceNotice.text}</p> : null}
            </section>

            <section className="card portal-settings-card" id="display" aria-labelledby="display-title">
              <div className="portal-settings-card-heading"><div className="portal-settings-card-icon display"><Monitor size={17} /></div><div><h2 id="display-title">Display preferences</h2><p>Make the reporting workspace easier to read.</p></div></div>
              <div className="portal-settings-preference-row"><div><strong>Report presentation</strong><small>Client reports use the agency-approved presentation layout so your team sees the same story.</small></div><span className="portal-settings-badge"><Check size={13} /> Standard</span></div>
              <div className="portal-settings-preference-row"><div><strong>Data freshness</strong><small>Live source status and latest update times appear on reporting pages.</small></div><span className="portal-settings-badge"><Check size={13} /> Enabled</span></div>
            </section>
          </div>

          <aside className="portal-settings-aside">
            <section className="card portal-settings-side-card" id="security" aria-labelledby="security-title"><div className="portal-settings-side-heading"><LockKeyhole size={16} /><h2 id="security-title">Security</h2></div><p>Your sign-in is protected by your account provider. Use a password reset if you need to change your credentials.</p><Link className="portal-settings-side-link" href="/auth/reset-password"><span>Change password</span><ChevronRight size={14} /></Link></section>
            <section className="card portal-settings-side-card" id="workspace-access" aria-labelledby="workspace-title"><div className="portal-settings-side-heading"><Palette size={16} /><h2 id="workspace-title">Workspace access</h2></div><div className="portal-workspace-summary"><span className="portal-workspace-avatar" style={{ backgroundColor: brandAccent ?? "#f26b38" }}>{brandMark ?? clientName.slice(0, 2).toUpperCase()}</span><div><strong>{clientName}</strong><small>Client portal workspace</small></div></div><p>Your agency controls which reports, metrics, and activities are visible here.</p><Link className="portal-settings-side-link" href="/portal/reports"><span>View published reports</span><ChevronRight size={14} /></Link></section>
            <section className="card portal-settings-side-card portal-settings-feedback-card" aria-labelledby="settings-feedback-title"><div className="portal-settings-side-heading"><MessageCircle size={16} /><h2 id="settings-feedback-title">Need something changed?</h2></div><p>Ask the AI Rankers team about access, reporting, or a data source.</p><Link className="button primary" href="/portal/feedback">Open feedback <ChevronRight size={14} /></Link></section>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
