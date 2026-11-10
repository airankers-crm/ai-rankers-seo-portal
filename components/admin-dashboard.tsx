"use client";

import Link from "next/link";
import { ArrowUpRight, CheckCircle2, FileCheck2, Layers3, MessageCircle, PencilLine, Plus, ShieldCheck, TriangleAlert, UsersRound } from "lucide-react";
import { useMemo } from "react";
import { demoClient, demoClients } from "@ai-rankers/core";
import type { DemoClient } from "@ai-rankers/core";
import { AppShell } from "./app-shell";

type AdminSummary = { publishedThisMonth: number };

function AgencyPulse({ clients, summary }: { clients: DemoClient[]; summary: AdminSummary }) {
  const serviceCount = clients.reduce((total, client) => total + client.services.length, 0);
  const needsReview = clients.filter((client) => client.status === "Paused" || (client.draftCount ?? 0) > 0).length;
  const metrics = useMemo(() => [
    { label: "Active client workspaces", value: clients.filter((client) => client.status === "Active").length, icon: UsersRound, tone: "teal" as const, state: "Live records", note: "Active workspaces in this agency" },
    { label: "Published this month", value: summary.publishedThisMonth, icon: FileCheck2, tone: "orange" as const, state: summary.publishedThisMonth ? "Tracked" : "No activity", note: summary.publishedThisMonth ? "Dashboard versions published" : "No versions published this month" },
    { label: "Needs review", value: needsReview, icon: TriangleAlert, tone: "purple" as const, state: needsReview ? "Review queue" : "Clear", note: "Draft sections or paused workspaces" },
    { label: "Visible services", value: serviceCount, icon: Layers3, tone: "blue" as const, state: serviceCount ? "Configured" : "Not configured", note: "Website SEO and GBP programs" },
  ], [clients, needsReview, serviceCount, summary.publishedThisMonth]);

  return <section className="card panel agency-pulse" aria-labelledby="agency-pulse-title">
    <div className="agency-pulse-heading">
      <div><p className="eyebrow">Operations / Live workspace signals</p><h2 id="agency-pulse-title">Workspace pulse</h2><p>A single view of client coverage, publishing activity, and the work that needs an operator.</p></div>
      <span className="agency-pulse-source"><span className="dot" /> Neon records</span>
    </div>
    <div className="agency-pulse-grid">
      {metrics.map((metric) => { const Icon = metric.icon; return <article className="agency-pulse-card" key={metric.label}>
        <div className="agency-pulse-card-top"><span className={`agency-pulse-icon ${metric.tone}`}><Icon size={14} /></span><span className="agency-pulse-label">{metric.label}</span></div>
        <strong className="agency-pulse-value">{metric.value.toLocaleString()}</strong>
        <div className="agency-pulse-state"><span className={`agency-pulse-state-dot ${metric.tone}`} />{metric.state}</div>
        <div className="agency-pulse-meter" aria-hidden="true"><span className={metric.tone} style={{ width: `${Math.min(100, Math.max(metric.value ? 18 : 6, metric.value * 18))}%` }} /></div>
        <small>{metric.note}</small>
      </article>; })}
    </div>
    <div className="agency-pulse-foot"><span><span className="dot" /> Live workspace state · no presentation-only totals</span><span>{clients.length} {clients.length === 1 ? "client" : "clients"}</span></div>
  </section>;
}

function AdminWorkflow({ previewClient }: { previewClient: DemoClient }) {
  const actions = [
    { label: "Manage client portal", detail: "Edit Website SEO and GBP results", href: `/admin/clients/${previewClient.id}`, icon: PencilLine, tone: "orange" },
    { label: "Open team communication", detail: "Review client groups and support messages", href: "/admin/messages", icon: MessageCircle, tone: "teal" },
    { label: "Add client workspace", detail: "Create an isolated reporting workspace", href: "/admin/clients/new", icon: Plus, tone: "purple" },
  ] as const;

  return <section className="card panel admin-workflow" aria-labelledby="admin-workflow-title">
    <div className="panel-heading"><div><p className="eyebrow">Admin workflow</p><h2 id="admin-workflow-title">Start with the next operator action</h2><p>Keep client setup, portal editing, and communication one click away.</p></div><ShieldCheck size={18} color="#148f83" /></div>
    <div className="admin-workflow-grid">{actions.map(({ label, detail, href, icon: Icon, tone }) => <Link className="admin-workflow-action" href={href} key={label}><span className={`admin-workflow-icon ${tone}`}><Icon size={15} /></span><span><strong>{label}</strong><small>{detail}</small></span><ArrowUpRight size={14} /></Link>)}</div>
  </section>;
}

export function AdminDashboard({ databaseClients, summary }: { databaseClients?: DemoClient[]; summary?: AdminSummary }) {
  const clients = databaseClients ?? demoClients;
  const previewClient = clients[0] ?? demoClient;
  const liveSummary = summary ?? { publishedThisMonth: 0 };
  const draftCount = previewClient.draftCount ?? 0;

  return (
    <AppShell mode="admin">
      <div className="content">
        <div className="page-heading">
          <div>
            <h1>Workspace overview</h1>
          </div>
          <div className="heading-actions"><Link className="button primary" href="/admin/clients/new"><Plus size={14} /> Add client</Link></div>
        </div>

        <AgencyPulse clients={clients} summary={liveSummary} />

        <AdminWorkflow previewClient={previewClient} />

        <section className="card panel" id="clients">
          <div className="panel-heading"><div><h2>Client workspaces</h2><p>Every client has an isolated dashboard, activity log, and publishing state.</p></div><Link className="button" href="/admin/users"><UsersRound size={14} /> Manage users</Link></div>
          <div className="table-scroll"><table className="client-table"><thead><tr><th>Client</th><th>Portal coverage</th><th>Content</th><th>Last published</th><th>State</th><th /></tr></thead><tbody>{clients.map((client) => <tr key={client.id}><td><div className="client-name"><span className="client-logo">{client.initials}</span><span><strong>{client.businessName}</strong><small>{client.portalUsers ?? 0} portal users</small></span></div></td><td>{client.services.length ? client.services.map((service) => <span className="service-tag" key={service}>{service}</span>) : <span className="table-muted">Not configured</span>}</td><td><strong className="table-number">{client.publishedMetrics ?? 0}</strong><span className="table-muted"> published metrics</span></td><td>{client.lastPublished}</td><td><span className={`status ${client.status === "Paused" ? "progress" : client.draftCount ? "progress" : "complete"}`}>{client.status === "Paused" ? "Paused" : client.draftCount ? `${client.draftCount} to review` : "Ready"}</span></td><td><Link className="table-action" href={`/admin/clients/${client.id}`}>Manage client <ArrowUpRight size={12} style={{ verticalAlign: "-2px" }} /></Link></td></tr>)}</tbody></table></div>
        </section>

        <div className="dashboard-grid" id="builder">
          <section className="card panel"><div className="panel-heading"><div><h2>Client presentation editor</h2><p>Prepare the client-visible results for {previewClient.businessName}</p></div><Link className="button" href={`/admin/clients/${previewClient.id}`}>Edit results <ArrowUpRight size={13} /></Link></div><div className="mini-list"><div className="list-row"><div className="list-icon"><Layers3 size={15} /></div><div className="list-body"><div className="list-title">Metric results</div><div className="list-meta">Edit values, reporting periods, notes, and publish state</div></div><span className={`status ${draftCount ? "progress" : "complete"}`}>{draftCount ? `${draftCount} draft${draftCount === 1 ? "" : "s"}` : "Ready"}</span></div><div className="list-row"><div className="list-icon"><CheckCircle2 size={15} /></div><div className="list-body"><div className="list-title">Client report preview</div><div className="list-meta">Review the polished GBP performance presentation before sharing</div></div><span className="status complete">Ready</span></div></div></section>
          <section className="card panel" id="audit"><div className="panel-heading"><div><h2>Safety rails</h2><p>Foundation checks for every change</p></div><ShieldCheck size={18} color="#148f83" /></div><div className="builder-note"><ShieldCheck size={17} />Client scope is resolved from the authenticated session. A browser-provided client ID is never trusted by itself.</div><div className="builder-note" style={{ marginTop: 10 }}><CheckCircle2 size={17} />Every publish, reset, and metric change creates an audit event.</div></section>
        </div>
      </div>
    </AppShell>
  );
}
