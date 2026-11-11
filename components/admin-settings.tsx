"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import {
  ArrowUpRight,
  Bell,
  Building2,
  CheckCircle2,
  ChevronRight,
  Database,
  LockKeyhole,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  UsersRound,
} from "lucide-react";
import { AppShell } from "./app-shell";
import type { WorkspaceSettingsValue } from "../lib/admin-settings";

const settingsSections = [
  { id: "workspace-profile", label: "Workspace profile", icon: Building2 },
  { id: "client-portal", label: "Client portal", icon: SlidersHorizontal },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "access-security", label: "Access & security", icon: LockKeyhole },
];

const fallbackSettings: WorkspaceSettingsValue = {
  id: "default",
  workspaceName: "The AI Rankers",
  defaultTimezone: "America/Los_Angeles",
  defaultReportingWindow: "6m",
  portalVisibility: "published",
  brandingMode: "default",
  notifyClientFeedback: true,
  notifyReportPublishing: true,
  notifySyncWarnings: false,
  updatedAt: new Date(0).toISOString(),
};

type Notice = { kind: "success" | "error"; text: string } | null;

function StatusPill({ tone, children }: { tone: "ready" | "review" | "future"; children: React.ReactNode }) {
  return <span className={`admin-setting-status ${tone}`}>{children}</span>;
}

function SettingRow({ label, description, value, tone = "ready", action }: { label: string; description: string; value: string; tone?: "ready" | "review" | "future"; action?: { label: string; href: string } }) {
  return (
    <div className="admin-setting-row">
      <div className="admin-setting-row-copy">
        <strong>{label}</strong>
        <small>{description}</small>
      </div>
      <div className="admin-setting-row-value">
        <StatusPill tone={tone}>{value}</StatusPill>
        {action ? <Link href={action.href} className="admin-setting-link">{action.label}<ArrowUpRight size={12} /></Link> : null}
      </div>
    </div>
  );
}

export function AdminSettings({ initialSettings, preview = false }: { initialSettings: WorkspaceSettingsValue | null; preview?: boolean }) {
  const [settings, setSettings] = useState<WorkspaceSettingsValue>(initialSettings ?? fallbackSettings);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (preview) {
      setNotice({ kind: "success", text: "Preview mode: settings will be saved after the database is connected." });
      return;
    }

    setSaving(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspaceName: settings.workspaceName,
          defaultTimezone: settings.defaultTimezone,
          defaultReportingWindow: settings.defaultReportingWindow,
          portalVisibility: settings.portalVisibility,
          brandingMode: settings.brandingMode,
          notifyClientFeedback: settings.notifyClientFeedback,
          notifyReportPublishing: settings.notifyReportPublishing,
          notifySyncWarnings: settings.notifySyncWarnings,
        }),
      });
      const body = await response.json().catch(() => null) as { settings?: WorkspaceSettingsValue; error?: string } | null;
      if (!response.ok || !body?.settings) {
        setNotice({ kind: "error", text: body?.error ?? "We could not save workspace settings." });
        return;
      }
      setSettings(body.settings);
      setNotice({ kind: "success", text: "Workspace settings saved to Neon." });
    } catch {
      setNotice({ kind: "error", text: "We could not reach the settings service. Try again." });
    } finally {
      setSaving(false);
    }
  }

  const lastSaved = settings.updatedAt === new Date(0).toISOString() ? "Not saved yet" : `Saved ${new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(settings.updatedAt))}`;

  return (
    <AppShell mode="admin" activeNav="Settings">
      <div className="content admin-settings-page">
        <div className="page-heading admin-settings-heading">
          <div>
            <p className="eyebrow">CRM workspace / Administration</p>
            <h1>Workspace settings</h1>
            <p>Manage the defaults and controls that shape every client workspace.</p>
          </div>
          <div className="admin-settings-heading-status"><span className="dot" /> {preview ? "Preview mode" : "Workspace ready"}</div>
        </div>

        <nav className="admin-settings-section-nav" aria-label="Settings sections">
          {settingsSections.map((section) => {
            const Icon = section.icon;
            return <a href={`#${section.id}`} key={section.id}><Icon size={13} />{section.label}</a>;
          })}
        </nav>

        <form className="admin-settings-form" onSubmit={saveSettings}>
        <section className="admin-settings-summary card">
          <div className="admin-settings-summary-icon"><Settings2 size={18} /></div>
          <div>
            <p className="eyebrow">Settings center</p>
            <h2>One place for workspace-wide defaults</h2>
            <p>These controls define the agency experience. Client-specific values remain managed from each client workspace.</p>
          </div>
          <div className="admin-settings-summary-score"><strong>4</strong><span>areas configured</span></div>
        </section>

        {notice ? <p className={notice.kind === "error" ? "auth-error admin-settings-notice" : "auth-success admin-settings-notice"} role="status">{notice.text}</p> : null}

        <div className="admin-settings-layout">
          <main className="admin-settings-main">
            <section className="card admin-settings-card" id="workspace-profile">
              <div className="admin-settings-card-heading">
                <div className="admin-settings-card-icon purple"><Building2 size={17} /></div>
                <div><h2>Workspace profile</h2><p>Defaults used when new client workspaces are created.</p></div>
                <StatusPill tone="ready">Persisted</StatusPill>
              </div>
              <div className="settings-grid admin-settings-edit-grid">
                <label>Workspace name<input value={settings.workspaceName} onChange={(event) => setSettings({ ...settings, workspaceName: event.target.value })} maxLength={80} /></label>
                <label>Default timezone<select value={settings.defaultTimezone} onChange={(event) => setSettings({ ...settings, defaultTimezone: event.target.value })}><option value="America/Los_Angeles">US / Los Angeles</option><option value="America/Denver">US / Denver</option><option value="America/Chicago">US / Chicago</option><option value="America/New_York">US / New York</option><option value="Europe/London">Europe / London</option><option value="Europe/Berlin">Europe / Berlin</option><option value="Asia/Dubai">Asia / Dubai</option><option value="Asia/Kolkata">Asia / Kolkata</option><option value="Asia/Singapore">Asia / Singapore</option><option value="Australia/Sydney">Australia / Sydney</option></select></label>
                <label>Default reporting window<select value={settings.defaultReportingWindow} onChange={(event) => setSettings({ ...settings, defaultReportingWindow: event.target.value })}><option value="3m">Last 3 months</option><option value="6m">Last 6 months</option><option value="12m">Last 12 months</option></select></label>
              </div>
            </section>

            <section className="card admin-settings-card" id="client-portal">
              <div className="admin-settings-card-heading">
                <div className="admin-settings-card-icon teal"><SlidersHorizontal size={17} /></div>
                <div><h2>Client portal defaults</h2><p>Set consistent, client-safe presentation rules across workspaces.</p></div>
                <StatusPill tone="ready">Persisted</StatusPill>
              </div>
              <div className="settings-grid admin-settings-edit-grid">
                <label>Portal visibility<select value={settings.portalVisibility} onChange={(event) => setSettings({ ...settings, portalVisibility: event.target.value })}><option value="published">Published results only</option><option value="approved">Approved results and reports</option></select></label>
                <label>Branding<select value={settings.brandingMode} onChange={(event) => setSettings({ ...settings, brandingMode: event.target.value })}><option value="default">AI Rankers default</option><option value="client">Client workspace branding</option></select></label>
              </div>
              <div className="admin-setting-list admin-settings-readiness-list">
                <SettingRow label="Tenant isolation" description="Client records and portal access remain scoped to the client workspace." value="Enforced" action={{ label: "Open clients", href: "/admin/clients" }} />
              </div>
            </section>

            <section className="card admin-settings-card" id="notifications">
              <div className="admin-settings-card-heading">
                <div className="admin-settings-card-icon orange"><Bell size={17} /></div>
                <div><h2>Notifications</h2><p>Decide which events need agency attention.</p></div>
                <StatusPill tone="ready">Persisted</StatusPill>
              </div>
              <div className="admin-settings-toggle-list">
                <label className="admin-settings-toggle"><input type="checkbox" checked={settings.notifyClientFeedback} onChange={(event) => setSettings({ ...settings, notifyClientFeedback: event.target.checked })} /><span><strong>Client feedback</strong><small>Highlight new questions, issues, and requests in the feedback inbox.</small></span></label>
                <label className="admin-settings-toggle"><input type="checkbox" checked={settings.notifyReportPublishing} onChange={(event) => setSettings({ ...settings, notifyReportPublishing: event.target.checked })} /><span><strong>Report publishing</strong><small>Keep report delivery changes visible to the agency team.</small></span></label>
                <label className="admin-settings-toggle"><input type="checkbox" checked={settings.notifySyncWarnings} onChange={(event) => setSettings({ ...settings, notifySyncWarnings: event.target.checked })} /><span><strong>Sync warnings</strong><small>Flag provider delays and failed refreshes before client delivery.</small></span></label>
              </div>
            </section>

            <section className="card admin-settings-card" id="access-security">
              <div className="admin-settings-card-heading">
                <div className="admin-settings-card-icon blue"><ShieldCheck size={17} /></div>
                <div><h2>Access & security</h2><p>Keep admin access, auditability, and future authentication work visible.</p></div>
                <StatusPill tone="ready">Baseline active</StatusPill>
              </div>
              <div className="admin-setting-list">
                <SettingRow label="Admin users and roles" description="Review who can manage clients, reports, integrations, and workspace settings." value="Role management" action={{ label: "Manage users", href: "/admin/users" }} />
                <SettingRow label="Audit trail" description="Sensitive admin actions should remain traceable for investigation and review." value="Available" action={{ label: "Open audit", href: "/admin/audit" }} />
                <SettingRow label="MFA and passkeys" description="Optional future phase; intentionally not required for the baseline version." value="Future phase" tone="future" />
              </div>
            </section>
            <div className="admin-settings-savebar">
              <span className="admin-settings-last-saved">{lastSaved}</span>
              <button className="button primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Save workspace settings"}<CheckCircle2 size={14} /></button>
            </div>
          </main>

          <aside className="admin-settings-aside">
            <section className="card admin-settings-side-card">
              <div className="admin-settings-side-heading"><Database size={16} /><h2>Connected sources</h2></div>
              <p>Source connections determine which metrics can be refreshed and published to client portals.</p>
              <div className="admin-settings-source-list">
                {[["GA4", "Organic sessions"], ["GSC", "Search visibility"], ["GBP", "Local actions"], ["DataForSEO", "Keyword rankings"]].map(([source, label]) => <div className="admin-settings-source" key={source}><span className="admin-settings-source-dot" /><span><strong>{source}</strong><small>{label}</small></span><ChevronRight size={13} /></div>)}
              </div>
              <Link href="/admin/integrations" className="admin-settings-side-link">Manage integrations <ArrowUpRight size={13} /></Link>
            </section>

            <section className="card admin-settings-side-card admin-settings-help-card">
              <div className="admin-settings-side-heading"><UsersRound size={16} /><h2>Need to change something?</h2></div>
              <p>Use the communication workspace when a setting needs review, approval, or a client-specific decision.</p>
              <Link href="/admin/messages" className="button primary">Open communication <ArrowUpRight size={13} /></Link>
            </section>

            <section className="admin-settings-truth">
              <CheckCircle2 size={16} />
              <div><strong>Clear configuration status</strong><p>Changes are stored in the agency workspace and recorded in the admin audit trail.</p></div>
            </section>
          </aside>
        </div>
        </form>
      </div>
    </AppShell>
  );
}
