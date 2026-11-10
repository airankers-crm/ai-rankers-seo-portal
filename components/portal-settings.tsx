"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Bell, Check, ChevronRight, CircleHelp, ExternalLink, LockKeyhole, Mail, Monitor, Palette, ShieldCheck, UserRound } from "lucide-react";
import { AppShell } from "./app-shell";

type PortalSettingsProps = {
  clientName: string;
  brandMark?: string | null;
  brandAccent?: string | null;
  clientTimezone: string;
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

export function PortalSettings({ clientName, brandMark, brandAccent, clientTimezone, userName, userEmail, canEditProfile }: PortalSettingsProps) {
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
          <a href="#profile">Your profile</a>
          <a href="#notifications">Notifications</a>
          <a href="#display">Display preferences</a>
          <a href="#security">Security</a>
          <a href="#workspace-access">Workspace access</a>
          <a href="#support">Need something changed?</a>
        </nav>

        <section className="portal-settings-intro card">
          <div className="portal-settings-intro-icon"><ShieldCheck size={20} /></div>
          <div><strong>Your client workspace is secure</strong><p>These settings apply to your portal account only. Reporting data, integrations, and what is published are managed by your agency team.</p></div>
          <Link className="button" href="/portal/messages"><CircleHelp size={14} /> Need help?</Link>
        </section>

        <div className="portal-settings-layout">
          <div className="portal-settings-main">
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
                <Toggle checked={preferences.teamMessages} label="Team communication" description="Keep up with replies and new messages from your agency team." onChange={() => updatePreference("teamMessages")} />
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
            <section className="card portal-settings-side-card portal-settings-help-card" id="support" aria-labelledby="help-title"><div className="portal-settings-side-heading"><Mail size={16} /><h2 id="help-title">Need something changed?</h2></div><p>Ask the AI Rankers team about access, reporting, or a data source.</p><Link className="button primary" href="/portal/messages">Message the team <ExternalLink size={13} /></Link></section>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
