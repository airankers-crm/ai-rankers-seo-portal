"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Bell, Building2, ChevronRight, ExternalLink, Globe2, Link2, LockKeyhole, MapPin, MessageCircle, Monitor, Palette, RefreshCw, ShieldCheck, UserRound } from "lucide-react";
import { AppShell } from "./app-shell";
import { persistPortalPreferences, type PortalPreferences } from "../lib/portal-preferences";

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
  initialPreferences: PortalPreferences;
};

type Notice = { kind: "success" | "error"; text: string } | null;

function Toggle({ checked, label, description, onChange, disabled = false }: { checked: boolean; label: string; description: string; onChange: () => void; disabled?: boolean }) {
  return (
    <button className="portal-setting-toggle" type="button" role="switch" aria-checked={checked} onClick={onChange} disabled={disabled}>
      <span className={`portal-toggle-track${checked ? " is-on" : ""}`}><span /></span>
      <span className="portal-setting-toggle-copy"><strong>{label}</strong><small>{description}</small></span>
    </button>
  );
}

export function PortalSettings({ clientName, brandMark, brandAccent, clientTimezone, websiteUrl, contactEmail, businessPhone, serviceArea, businessHours, hasGbpSeo, userName, userEmail, canEditProfile, initialPreferences }: PortalSettingsProps) {
  const [name, setName] = useState(userName);
  const [savedName, setSavedName] = useState(userName);
  const [savingName, setSavingName] = useState(false);
  const [profileNotice, setProfileNotice] = useState<Notice>(null);
  const [preferences, setPreferences] = useState(initialPreferences);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [preferenceNotice, setPreferenceNotice] = useState<Notice>(null);
  const profileDirty = name.trim() !== savedName.trim();

  async function updatePreference(key: keyof PortalPreferences) {
    const next = { ...preferences, [key]: !preferences[key] };
    setPreferences(next);
    setSavingPreferences(true);
    setPreferenceNotice(null);
    const response = await fetch("/api/portal/account", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ preferences: next }) }).catch(() => null);
    const body = await response?.json().catch(() => null) as { error?: string; preferences?: PortalPreferences } | null;
    setSavingPreferences(false);
    if (!response?.ok) {
      setPreferences(preferences);
      setPreferenceNotice({ kind: "error", text: body?.error ?? "We could not save your preferences." });
      return;
    }
    const saved = body?.preferences ?? next;
    setPreferences(saved);
    persistPortalPreferences(saved);
    setPreferenceNotice({ kind: "success", text: "Preferences saved to your account and applied to the portal." });
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canEditProfile) {
      setProfileNotice({ kind: "success", text: "Preview mode: profile changes are not connected to an account." });
      return;
    }
    setSavingName(true);
    setProfileNotice(null);
    const response = await fetch("/api/portal/account", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) }).catch(() => null);
    const body = await response?.json().catch(() => null) as { error?: string } | null;
    setSavingName(false);
    if (response?.ok) {
      const nextName = name.trim();
      setName(nextName);
      setSavedName(nextName);
      setProfileNotice({ kind: "success", text: "Profile updated successfully." });
    } else {
      setProfileNotice({ kind: "error", text: body?.error ?? "We could not update your profile." });
    }
  }

  return (
    <AppShell mode="portal" clientName={clientName} brandMark={brandMark ?? undefined} brandAccent={brandAccent ?? undefined} activeNav="Settings">
      <div className="content portal-settings-page">
        <div className="page-heading portal-settings-heading">
          <div>
            <p className="eyebrow">Client portal / Account</p>
            <h1>Settings</h1>
            <p>Manage your account, communication choices, and portal reading experience.</p>
          </div>
          <div className="portal-settings-heading-status"><span className="status-dot" /> Account settings active</div>
        </div>

        <nav className="portal-settings-section-nav" aria-label="Settings sections">
          <a href="#business">Workspace</a>
          <a href="#gbp">Data access</a>
          <a href="#profile">Your profile</a>
          <a href="#notifications">Notifications</a>
          <a href="#display">Accessibility</a>
          <a href="#security">Security</a>
          <a href="#workspace-access">Permissions</a>
        </nav>

        <section className="portal-settings-intro card">
          <div className="portal-settings-intro-icon"><ShieldCheck size={20} /></div>
          <div><strong>Clear account controls, protected reporting data</strong><p>Your profile and preferences belong to your account. Business identity, integrations, and published reporting remain agency-managed so every client sees approved data.</p></div>
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
              <div className="portal-settings-integration-head"><div className="portal-settings-integration-name"><span className="portal-settings-provider-icon"><Globe2 size={16} /></span><div><strong>Google Business Profile</strong><small>{hasGbpSeo ? "Reporting section enabled" : "Reporting section not enabled"}</small></div></div><span className={`portal-settings-badge${hasGbpSeo ? "" : " is-muted"}`}><span className="status-dot" /> {hasGbpSeo ? "Available" : "Unavailable"}</span></div>
              <div className="portal-settings-detail-grid portal-settings-integration-grid">
                <div><span><Link2 size={11} /> Reporting access</span><strong>{hasGbpSeo ? "Managed by your agency" : "Awaiting setup"}</strong></div>
                <div><span><MapPin size={11} /> Profile location</span><strong>{clientName}</strong></div>
                <div><span><RefreshCw size={11} /> Provider sync</span><strong>Connection status is agency-managed</strong></div>
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
                <div className="portal-settings-form-footer"><span className="portal-settings-readonly"><LockKeyhole size={12} /> Email and workspace access are controlled securely.</span><button className="button primary" type="submit" disabled={savingName || !profileDirty || name.trim().length < 2}>{savingName ? "Saving…" : profileDirty ? "Save profile" : "Profile saved"}</button></div>
              </form>
            </section>

            <section className="card portal-settings-card" id="notifications" aria-labelledby="notifications-title">
              <div className="portal-settings-card-heading"><div className="portal-settings-card-icon notifications"><Bell size={17} /></div><div><h2 id="notifications-title">Communication preferences</h2><p>Choose which published workspace updates your agency may notify you about.</p></div></div>
              <div className="portal-setting-list">
                <Toggle checked={preferences.reportUpdates} label="Report updates" description="Allow notifications when a new client report is published." onChange={() => void updatePreference("reportUpdates")} disabled={savingPreferences || !canEditProfile} />
                <Toggle checked={preferences.taskUpdates} label="Activity and task updates" description="Allow notifications when published work changes or needs your attention." onChange={() => void updatePreference("taskUpdates")} disabled={savingPreferences || !canEditProfile} />
                <Toggle checked={preferences.teamMessages} label="Support replies" description="Allow notifications when the AI Rankers team responds to a request." onChange={() => void updatePreference("teamMessages")} disabled={savingPreferences || !canEditProfile} />
              </div>
              {preferenceNotice ? <p className={preferenceNotice.kind === "error" ? "auth-error" : "auth-success"} role="status">{preferenceNotice.text}</p> : null}
            </section>

            <section className="card portal-settings-card" id="display" aria-labelledby="display-title">
              <div className="portal-settings-card-heading"><div className="portal-settings-card-icon display"><Monitor size={17} /></div><div><h2 id="display-title">Accessibility &amp; display</h2><p>Adjust the portal without changing the published reporting data.</p></div></div>
              <div className="portal-setting-list">
                <Toggle checked={preferences.compactLayout} label="Compact layout" description="Use tighter card and table spacing to show more information at once." onChange={() => void updatePreference("compactLayout")} disabled={savingPreferences || !canEditProfile} />
                <Toggle checked={preferences.reduceMotion} label="Reduce motion" description="Minimize animation and movement throughout the client portal." onChange={() => void updatePreference("reduceMotion")} disabled={savingPreferences || !canEditProfile} />
              </div>
              <p className="portal-settings-preference-help"><ShieldCheck size={13} /> Display preferences are stored on your account and applied across portal screens.</p>
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
