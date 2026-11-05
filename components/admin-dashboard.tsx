"use client";

import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Layers3, Plus, ShieldCheck, UsersRound } from "lucide-react";
import { demoClient, demoClients } from "@ai-rankers/core";
import type { DemoClient } from "@ai-rankers/core";
import { AppShell } from "./app-shell";

export function AdminDashboard({ databaseClients }: { databaseClients?: DemoClient[] }) {
  const clients = databaseClients ?? demoClients;
  const previewClient = clients[0] ?? demoClient;

  return (
    <AppShell mode="admin">
      <div className="content">
        <div className="page-heading">
          <div>
            <p className="eyebrow">AI Rankers / Operations</p>
            <h1>Workspace overview</h1>
            <p>Manage client dashboards, review publishing status, and keep the delivery team moving from one calm workspace.</p>
          </div>
          <div className="heading-actions"><Link className="button primary" href="/admin/clients/new"><Plus size={14} /> Add client</Link></div>
        </div>

        <div className="admin-stat-grid">
          <article className="card admin-stat"><div className="admin-stat-label">Active clients</div><div className="admin-stat-value">{clients.length}</div><div className="admin-stat-note">↑ 2 this quarter</div></article>
          <article className="card admin-stat"><div className="admin-stat-label">Published this month</div><div className="admin-stat-value">18</div><div className="admin-stat-note">↑ 12% vs October</div></article>
          <article className="card admin-stat"><div className="admin-stat-label">Needs attention</div><div className="admin-stat-value">3</div><div className="admin-stat-note" style={{ color: "#b07623" }}>Drafts waiting to publish</div></article>
        </div>

        <section className="card panel" id="clients">
          <div className="panel-heading"><div><h2>Client workspaces</h2><p>Every client has an isolated dashboard, activity log, and publishing state.</p></div><Link className="button" href="/admin/users"><UsersRound size={14} /> Manage users</Link></div>
          <div className="table-scroll"><table className="client-table"><thead><tr><th>Client</th><th>Services</th><th>Last published</th><th>Status</th><th /></tr></thead><tbody>{clients.map((client) => <tr key={client.id}><td><div className="client-name"><span className="client-logo">{client.initials}</span>{client.businessName}</div></td><td>{client.services.map((service) => <span className="service-tag" key={service}>{service}</span>)}</td><td>{client.lastPublished}</td><td><span className="status complete">{client.status}</span></td><td><Link className="table-action" href={`/admin/clients/${client.id}`}>Manage client <ArrowUpRight size={12} style={{ verticalAlign: "-2px" }} /></Link></td></tr>)}</tbody></table></div>
        </section>

        <div className="dashboard-grid" id="builder">
          <section className="card panel"><div className="panel-heading"><div><h2>Dashboard builder</h2><p>Draft layout for {previewClient.businessName}</p></div><Link className="button" href="/portal">Preview <ArrowUpRight size={13} /></Link></div><div className="mini-list"><div className="list-row"><div className="list-icon"><Layers3 size={15} /></div><div className="list-body"><div className="list-title">Overview metrics</div><div className="list-meta">4 visible metrics · last edited 18 min ago</div></div><span className="status progress">Draft</span></div><div className="list-row"><div className="list-icon"><CheckCircle2 size={15} /></div><div className="list-body"><div className="list-title">Website SEO</div><div className="list-meta">12 visible metrics · published Nov 4</div></div><span className="status complete">Published</span></div></div></section>
          <section className="card panel" id="audit"><div className="panel-heading"><div><h2>Safety rails</h2><p>Foundation checks for every change</p></div><ShieldCheck size={18} color="#148f83" /></div><div className="builder-note"><ShieldCheck size={17} />Client scope is resolved from the authenticated session. A browser-provided client ID is never trusted by itself.</div><div className="builder-note" style={{ marginTop: 10 }}><CheckCircle2 size={17} />Every publish, reset, and metric change creates an audit event.</div></section>
        </div>
      </div>
    </AppShell>
  );
}
