"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  Globe2,
  MapPin,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import { demoClient, demoMetrics, demoReports, demoActivities, formatMetricTrend, getMetricTrend } from "@ai-rankers/core";
import type { DemoActivity, DemoMetric, DemoReport } from "@ai-rankers/core";
import { AppShell } from "./app-shell";
import { TrendChart } from "./trend-chart";

const ranges = ["Last 30 days", "Last 90 days", "This year"];

type PortalDatabaseData = {
  businessName: string;
  metrics: {
    organicTraffic?: DemoMetric;
    impressions?: DemoMetric;
    topTen?: DemoMetric;
    calls?: DemoMetric;
  };
  activities: DemoActivity[];
  reports: DemoReport[];
};

export function PortalDashboard({ databaseData }: { databaseData?: PortalDatabaseData }) {
  const [range, setRange] = useState(ranges[0]);
  const [selectedReport, setSelectedReport] = useState<DemoReport | null>(null);
  const metrics = {
    organicTraffic: databaseData?.metrics.organicTraffic ?? demoMetrics.organicTraffic,
    impressions: databaseData?.metrics.impressions ?? demoMetrics.impressions,
    topTen: databaseData?.metrics.topTen ?? demoMetrics.topTen,
    calls: databaseData?.metrics.calls ?? demoMetrics.calls,
  };
  const activities = databaseData?.activities ?? demoActivities;
  const reports = databaseData?.reports ?? demoReports;
  const clientName = databaseData?.businessName ?? demoClient.businessName;
  const chartData = useMemo(() => {
    const visiblePoints = range === ranges[0] ? 2 : range === ranges[1] ? 3 : metrics.organicTraffic.history.length;
    return metrics.organicTraffic.history.slice(-visiblePoints).map((point) => ({ label: point.label, value: point.value }));
  }, [metrics.organicTraffic.history, range]);
  const trafficTrend = getMetricTrend(metrics.organicTraffic);
  const keywordTrend = getMetricTrend(metrics.topTen);

  return (
    <AppShell mode="portal" clientName={clientName}>
      <div className="content">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Client portal / November 2026</p>
            <h1>Your SEO progress, at a glance.</h1>
            <p>A calm, clear view of what changed, what is working, and where your team is focusing next for {clientName}.</p>
          </div>
          <div className="heading-actions">
            <button className="button" onClick={() => window.print()}><Download size={14} /> Print summary</button>
          </div>
        </div>

        <section className="card executive-hero" aria-labelledby="executive-summary-title">
          <div className="executive-copy">
            <div className="executive-label"><span className="signal-dot" /> Executive summary <span>·</span> November 2026</div>
            <h2 id="executive-summary-title">Momentum is building across search and local visibility.</h2>
            <p>Organic traffic and search visibility are both trending up this period. The next focus is turning that visibility into more consistent local engagement and qualified demand.</p>
            <div className="executive-points">
              <div><CheckCircle2 size={16} /><span><strong>{formatMetricTrend(trafficTrend)} organic traffic</strong><small>vs previous period</small></span></div>
              <div><CheckCircle2 size={16} /><span><strong>{metrics.topTen.value} top-10 keywords</strong><small>{formatMetricTrend(keywordTrend)} this period</small></span></div>
            </div>
          </div>
          <div className="executive-signal"><div className="signal-orbit"><span>✓</span></div><p>Program status</p><strong>On track</strong><small>Healthy progress across active workstreams</small></div>
        </section>

        <div className="range-bar">
          <div className="range-tabs" aria-label="Date range">
            {ranges.map((item) => <button key={item} type="button" className={`range-tab${range === item ? " active" : ""}`} aria-pressed={range === item} onClick={() => setRange(item)}>{item}</button>)}
          </div>
          <div className="sync-note"><span className="dot" /> Last synced Nov 3, 2026 · Google data has a 2–3 day delay</div>
        </div>

        <div className="metrics-grid">
          <MetricCard label="Organic traffic" value={metrics.organicTraffic.value.toLocaleString()} trend={formatMetricTrend(getMetricTrend(metrics.organicTraffic))} icon={<Globe2 size={15} />} tone="orange" positive />
          <MetricCard label="Search impressions" value={`${(metrics.impressions.value / 1000).toFixed(1)}K`} trend={formatMetricTrend(getMetricTrend(metrics.impressions))} icon={<TrendingUp size={15} />} positive />
          <MetricCard label="Keywords in top 10" value={metrics.topTen.value.toLocaleString()} trend={formatMetricTrend(getMetricTrend(metrics.topTen))} icon={<Sparkles size={15} />} tone="teal" positive />
          <MetricCard label="GBP calls generated" value={metrics.calls.value.toLocaleString()} trend={formatMetricTrend(getMetricTrend(metrics.calls))} icon={<MapPin size={15} />} tone="teal" positive />
        </div>

        <div className="insight-grid">
          <section className="card insight-card insight-orange">
            <div className="insight-icon"><TrendingUp size={16} /></div>
            <div><p className="insight-label">What changed</p><h2>Visibility is compounding.</h2><p>Search impressions reached {(metrics.impressions.value / 1000).toFixed(1)}K while {metrics.topTen.value} keywords now appear in the top 10. That gives the next round of content and conversion work a stronger base.</p></div>
          </section>
          <section className="card insight-card insight-teal">
            <div className="insight-icon"><Sparkles size={16} /></div>
            <div><p className="insight-label">Next focus</p><h2>Turn attention into action.</h2><p>Keep the momentum moving through review responses, local content, and the service pages that are already attracting more organic visits.</p></div>
          </section>
        </div>

        <div className="dashboard-grid">
          <section className="card panel" id="website">
            <div className="panel-heading">
              <div><h2>Organic traffic trend</h2><p>Sessions from organic search · {range.toLowerCase()}</p></div>
              <div className="legend"><span className="legend-line" /> Organic sessions</div>
            </div>
            <TrendChart data={chartData} />
          </section>
          <section className="card panel" id="gbp">
            <div className="panel-heading">
              <div><h2>Program progress</h2><p>Current optimization focus</p></div>
              <Sparkles size={17} color="#f26b38" />
            </div>
            <div className="progress-row"><span>Profile optimization</span><strong>76%</strong></div>
            <div className="progress-track"><div className="progress-fill" style={{ width: "76%" }} /></div>
            <p className="progress-note">Your team has completed the core profile cleanup. Review responses and local content are the next focus areas.</p>
            <div className="progress-row"><span>Monthly deliverables</span><strong>8 / 10</strong></div>
            <div className="progress-track"><div className="progress-fill" style={{ width: "80%", background: "linear-gradient(90deg, #148f83, #70c8bd)" }} /></div>
          </section>
        </div>

        <div className="bottom-grid">
          <section className="card panel" id="activities">
            <div className="panel-heading"><div><h2>Latest activity</h2><p>Recent work completed by your SEO team</p></div><a className="panel-link" href="#activities">View all</a></div>
            <div className="mini-list">
              {activities.length > 0 ? activities.map((activity) => <div className="list-row" key={activity.id}><div className="list-icon">{activity.status === "COMPLETED" ? <CheckCircle2 size={15} /> : <Clock3 size={15} />}</div><div className="list-body"><div className="list-title">{activity.title}</div><div className="list-meta">{activity.category} · {activity.date}</div></div><div className={`status ${activity.status === "COMPLETED" ? "complete" : "progress"}`}>{activity.status === "COMPLETED" ? "Completed" : "In progress"}</div></div>) : <EmptyState message="Your SEO team’s latest activity will appear here." />}
            </div>
          </section>
          <section className="card panel" id="reports">
            <div className="panel-heading"><div><h2>Recent reports</h2><p>Performance summaries from your team</p></div><a className="panel-link" href="#reports">View all</a></div>
            <div className="mini-list">
              {reports.length > 0 ? reports.map((report) => <button type="button" className="report-row report-button" key={report.id} onClick={() => setSelectedReport(report)} aria-label={`Preview ${report.title}`}><div className="file-icon"><FileText size={16} /></div><div><div className="report-name">{report.title}</div><div className="report-meta">{report.type} · {report.period}</div></div><Download className="download" size={15} /></button>) : <EmptyState message="Published reports will appear here once your team shares them." />}
            </div>
          </section>
        </div>
      </div>
      {selectedReport && <ReportPreview report={selectedReport} onClose={() => setSelectedReport(null)} />}
    </AppShell>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div className="empty-state"><div className="empty-state-mark"><Sparkles size={15} /></div><p>{message}</p></div>;
}

function ReportPreview({ report, onClose }: { report: DemoReport; onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section className="report-modal" role="dialog" aria-modal="true" aria-labelledby="report-preview-title" onClick={(event) => event.stopPropagation()}>
        <div className="modal-heading"><div><p className="eyebrow">Client report</p><h2 id="report-preview-title">{report.title}</h2><p>{report.type} · {report.period}</p></div><button type="button" className="icon-button" aria-label="Close report preview" onClick={onClose}><X size={16} /></button></div>
        <div className="report-preview-note"><CheckCircle2 size={16} /><div><strong>Prepared for your review</strong><p>This report summarizes the latest work and performance signals from your SEO program.</p></div></div>
        <div className="report-preview-grid"><div><span>Report type</span><strong>{report.type}</strong></div><div><span>Reporting period</span><strong>{report.period}</strong></div><div><span>Workspace</span><strong>Client presentation</strong></div></div>
        <div className="modal-actions"><button type="button" className="button" onClick={onClose}>Close</button><button type="button" className="button primary" onClick={() => window.print()}><Download size={14} /> Print report</button></div>
      </section>
    </div>
  );
}

function MetricCard({ label, value, trend, icon, tone, positive }: { label: string; value: string; trend: string; icon: React.ReactNode; tone?: string; positive?: boolean }) {
  return <article className="card metric-card"><div className="metric-top"><span className="metric-label">{label}</span><span className={`metric-icon ${tone ?? ""}`}>{icon}</span></div><div className="metric-value">{value}</div><div className="metric-foot"><span className={positive ? "trend-up" : "trend-down"}>{positive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />} {trend}</span><span className="metric-period">vs previous period</span></div></article>;
}
