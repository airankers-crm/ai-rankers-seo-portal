"use client";

import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, CheckCircle2, Clock3, FileCheck2, Layers3, Plus, ShieldCheck, TriangleAlert, UsersRound } from "lucide-react";
import { useMemo, useState, type MouseEvent } from "react";
import { demoClient, demoClients } from "@ai-rankers/core";
import type { DemoClient } from "@ai-rankers/core";
import { AppShell } from "./app-shell";

type PulseRange = "Week" | "Month" | "Quarter";

function PulseSparkline({ points, tone, label }: { points: number[]; tone: "orange" | "teal" | "purple" | "blue"; label: string }) {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const spread = max - min || 1;
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const coordinates = points.map((point, index) => ({ x: (index / (points.length - 1)) * 100, y: 38 - ((point - min) / spread) * 28, value: point }));
  const linePoints = coordinates.map(({ x, y }) => `${x},${y}`).join(" ");
  const activePoint = hoveredIndex === null ? null : coordinates[hoveredIndex];
  const handleMouseMove = (event: MouseEvent<SVGSVGElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const position = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
    setHoveredIndex(Math.round(position * (points.length - 1)));
  };
  return <div className="agency-pulse-sparkline-wrap">
    <svg className={`agency-pulse-sparkline ${tone}`} viewBox="0 0 100 42" role="img" aria-label={`${label} trend`} preserveAspectRatio="none" onMouseMove={handleMouseMove} onMouseLeave={() => setHoveredIndex(null)}>
      <polyline points={`${linePoints} 100,42 0,42`} className="agency-pulse-area" />
      <polyline points={linePoints} className="agency-pulse-line" />
      {activePoint && <><line x1={activePoint.x} x2={activePoint.x} y1="3" y2="40" className="agency-pulse-guide" /><circle cx={activePoint.x} cy={activePoint.y} r="2.5" className="agency-pulse-point" /></>}
    </svg>
    {activePoint && <div className="agency-pulse-tooltip" style={{ left: `${Math.min(86, Math.max(14, activePoint.x))}%` }}><strong>{activePoint.value.toLocaleString()}</strong><span>Day {(hoveredIndex ?? 0) + 1} of {points.length}</span></div>}
  </div>;
}

function AgencyPulse({ clients }: { clients: DemoClient[] }) {
  const [range, setRange] = useState<PulseRange>("Week");
  const rangeCopy = range === "Week" ? "vs start of week" : range === "Month" ? "vs start of month" : "vs start of quarter";
  const serviceCount = clients.reduce((total, client) => total + client.services.length, 0);
  const metrics = useMemo(() => [
    { label: "Active clients", value: clients.length, change: "+2", direction: "up" as const, icon: UsersRound, tone: "teal" as const, points: [2, 2, 2, 3, 3, clients.length], note: "Client workspaces currently active" },
    { label: "Published this month", value: 18, change: "+12%", direction: "up" as const, icon: FileCheck2, tone: "orange" as const, points: [10, 12, 11, 14, 16, 18], note: "Reports and client updates" },
    { label: "Needs attention", value: 3, change: "-1", direction: "down" as const, icon: TriangleAlert, tone: "purple" as const, points: [6, 5, 5, 4, 4, 3], note: "Drafts or delivery blockers" },
    { label: "SEO services live", value: serviceCount, change: "+1", direction: "up" as const, icon: Clock3, tone: "blue" as const, points: [2, 2, 3, 3, 4, serviceCount], note: "Website SEO and GBP programs" },
  ], [clients.length, serviceCount]);

  return <section className="card panel agency-pulse" aria-labelledby="agency-pulse-title">
    <div className="agency-pulse-heading">
      <div><p className="eyebrow">Operations / Agency pulse</p><h2 id="agency-pulse-title">Workspace pulse</h2><p>Adoption, delivery, and attention signals across every client workspace.</p></div>
      <div className="agency-pulse-range" role="tablist" aria-label="Agency pulse range">
        {(["Week", "Month", "Quarter"] as PulseRange[]).map((item) => <button key={item} type="button" role="tab" aria-selected={range === item} className={range === item ? "active" : ""} onClick={() => setRange(item)}>{item}</button>)}
      </div>
    </div>
    <div className="agency-pulse-grid">
      {metrics.map((metric) => { const Icon = metric.icon; return <article className="agency-pulse-card" key={metric.label}>
        <div className="agency-pulse-card-top"><span className={`agency-pulse-icon ${metric.tone}`}><Icon size={14} /></span><span className="agency-pulse-label">{metric.label}</span></div>
        <strong className="agency-pulse-value">{metric.value.toLocaleString()}</strong>
        <div className="agency-pulse-change"><span className={metric.direction === "up" ? "trend-up" : "trend-down"}>{metric.direction === "up" ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />} {metric.change}</span><span>{rangeCopy}</span></div>
        <PulseSparkline points={metric.points} tone={metric.tone} label={metric.label} />
        <small>{metric.note}</small>
      </article>; })}
    </div>
    <div className="agency-pulse-foot"><span><span className="dot" /> Presentation data · source connections pending</span><span>Range: {range}</span></div>
  </section>;
}

export function AdminDashboard({ databaseClients }: { databaseClients?: DemoClient[] }) {
  const clients = databaseClients ?? demoClients;
  const previewClient = clients[0] ?? demoClient;

  return (
    <AppShell mode="admin">
      <div className="content">
        <div className="page-heading">
          <div>
            <p className="eyebrow">The AI Rankers / Operations</p>
            <h1>Workspace overview</h1>
            <p>Manage client workspaces, report status, and delivery operations.</p>
          </div>
          <div className="heading-actions"><Link className="button primary" href="/admin/clients/new"><Plus size={14} /> Add client</Link></div>
        </div>

        <AgencyPulse clients={clients} />

        <section className="card panel" id="clients">
          <div className="panel-heading"><div><h2>Client workspaces</h2><p>Every client has an isolated dashboard, activity log, and publishing state.</p></div><Link className="button" href="/admin/users"><UsersRound size={14} /> Manage users</Link></div>
          <div className="table-scroll"><table className="client-table"><thead><tr><th>Client</th><th>Services</th><th>Last published</th><th>Status</th><th /></tr></thead><tbody>{clients.map((client) => <tr key={client.id}><td><div className="client-name"><span className="client-logo">{client.initials}</span>{client.businessName}</div></td><td>{client.services.map((service) => <span className="service-tag" key={service}>{service}</span>)}</td><td>{client.lastPublished}</td><td><span className="status complete">{client.status}</span></td><td><Link className="table-action" href={`/admin/clients/${client.id}`}>Manage client <ArrowUpRight size={12} style={{ verticalAlign: "-2px" }} /></Link></td></tr>)}</tbody></table></div>
        </section>

        <div className="dashboard-grid" id="builder">
          <section className="card panel"><div className="panel-heading"><div><h2>Client presentation editor</h2><p>Prepare the client-visible results for {previewClient.businessName}</p></div><Link className="button" href={`/admin/clients/${previewClient.id}`}>Edit results <ArrowUpRight size={13} /></Link></div><div className="mini-list"><div className="list-row"><div className="list-icon"><Layers3 size={15} /></div><div className="list-body"><div className="list-title">Metric results</div><div className="list-meta">Edit values, reporting periods, notes, and publish state</div></div><span className="status progress">Review</span></div><div className="list-row"><div className="list-icon"><CheckCircle2 size={15} /></div><div className="list-body"><div className="list-title">Client report preview</div><div className="list-meta">Review the polished GBP performance presentation before sharing</div></div><span className="status complete">Ready</span></div></div></section>
          <section className="card panel" id="audit"><div className="panel-heading"><div><h2>Safety rails</h2><p>Foundation checks for every change</p></div><ShieldCheck size={18} color="#148f83" /></div><div className="builder-note"><ShieldCheck size={17} />Client scope is resolved from the authenticated session. A browser-provided client ID is never trusted by itself.</div><div className="builder-note" style={{ marginTop: 10 }}><CheckCircle2 size={17} />Every publish, reset, and metric change creates an audit event.</div></section>
        </div>
      </div>
    </AppShell>
  );
}
