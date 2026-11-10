"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  Bell,
  Building2,
  CheckCircle2,
  ChevronRight,
  Database,
  Globe2,
  LockKeyhole,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  UsersRound,
} from "lucide-react";
import { AppShell } from "./app-shell";

const settingsSections = [
  { id: "workspace-profile", label: "Workspace profile", icon: Building2 },
  { id: "client-portal", label: "Client portal", icon: SlidersHorizontal },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "access-security", label: "Access & security", icon: LockKeyhole },
];

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

export function AdminSettings() {
  return (
    <AppShell mode="admin" activeNav="Settings">
      <div className="content admin-settings-page">
        <div className="page-heading admin-settings-heading">
          <div>
            <p className="eyebrow">CRM workspace / Administration</p>
            <h1>Workspace settings</h1>
            <p>Manage the defaults and controls that shape every client workspace.</p>
          </div>
          <div className="admin-settings-heading-status"><span className="dot" /> Workspace ready</div>
        </div>

        <nav className="admin-settings-section-nav" aria-label="Settings sections">
          {settingsSections.map((section) => {
            const Icon = section.icon;
            return <a href={`#${section.id}`} key={section.id}><Icon size={13} />{section.label}</a>;
          })}
        </nav>

        <section className="admin-settings-summary card">
          <div className="admin-settings-summary-icon"><Settings2 size={18} /></div>
          <div>
            <p className="eyebrow">Settings center</p>
            <h2>One place for workspace-wide defaults</h2>
            <p>These controls define the agency experience. Client-specific values remain managed from each client workspace.</p>
          </div>
          <div className="admin-settings-summary-score"><strong>3</strong><span>areas ready</span></div>
        </section>

        <div className="admin-settings-layout">
          <main className="admin-settings-main">
            <section className="card admin-settings-card" id="workspace-profile">
              <div className="admin-settings-card-heading">
                <div className="admin-settings-card-icon purple"><Building2 size={17} /></div>
                <div><h2>Workspace profile</h2><p>Defaults used when new client workspaces are created.</p></div>
                <StatusPill tone="ready">Configured</StatusPill>
              </div>
              <div className="admin-setting-list">
                <SettingRow label="Workspace name" description="Displayed in admin navigation and internal reports." value="The AI Rankers" />
                <SettingRow label="Default timezone" description="Used for reporting periods, activity timestamps, and scheduled work." value="America/Los_Angeles" tone="review" action={{ label: "Review", href: "/admin/settings#workspace-profile" }} />
                <SettingRow label="Default reporting window" description="The starting period for new performance views." value="Last 6 months" />
              </div>
            </section>

            <section className="card admin-settings-card" id="client-portal">
              <div className="admin-settings-card-heading">
                <div className="admin-settings-card-icon teal"><SlidersHorizontal size={17} /></div>
                <div><h2>Client portal defaults</h2><p>Set consistent, client-safe presentation rules across workspaces.</p></div>
                <StatusPill tone="ready">Active</StatusPill>
              </div>
              <div className="admin-setting-list">
                <SettingRow label="Portal visibility" description="Client workspaces can view published results and approved reports." value="Published results only" />
                <SettingRow label="Branding" description="The AI Rankers branding is applied by default to client-facing pages." value="AI Rankers default" />
                <SettingRow label="Tenant isolation" description="Client records and portal access remain scoped to the client workspace." value="Enforced" action={{ label: "Open clients", href: "/admin/clients" }} />
              </div>
            </section>

            <section className="card admin-settings-card" id="notifications">
              <div className="admin-settings-card-heading">
                <div className="admin-settings-card-icon orange"><Bell size={17} /></div>
                <div><h2>Notifications</h2><p>Decide which events need agency attention.</p></div>
                <StatusPill tone="review">Review needed</StatusPill>
              </div>
              <div className="admin-setting-list">
                <SettingRow label="Client feedback" description="New questions, issues, and requests appear in the feedback inbox." value="Inbox available" action={{ label: "Open feedback", href: "/admin/feedback" }} />
                <SettingRow label="Report publishing" description="Published reports remain controlled by the admin team." value="Manual publish" />
                <SettingRow label="Sync warnings" description="Provider delays and failed refreshes should be reviewed before client delivery." value="Not configured" tone="review" action={{ label: "Open sync health", href: "/admin/sync-health" }} />
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
              <div><strong>Clear configuration status</strong><p>The screen distinguishes configured defaults, items needing review, and future work. No setting is presented as live when it is not persisted.</p></div>
            </section>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}
