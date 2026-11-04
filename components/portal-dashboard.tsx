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
  const metrics = {
    organicTraffic: databaseData?.metrics.organicTraffic ?? demoMetrics.organicTraffic,
    impressions: databaseData?.metrics.impressions ?? demoMetrics.impressions,
    topTen: databaseData?.metrics.topTen ?? demoMetrics.topTen,
    calls: databaseData?.metrics.calls ?? demoMetrics.calls,
  };
  const activities = databaseData?.activities ?? demoActivities;
  const reports = databaseData?.reports ?? demoReports;
  const clientName = databaseData?.businessName ?? demoClient.businessName;
  const chartData = useMemo(() => metrics.organicTraffic.history.map((point) => ({ label: point.label, value: point.value })), [metrics.organicTraffic.history]);

  return (
    <AppShell mode="portal">
      <div className="content">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Client portal / November 2026</p>
            <h1>Good morning, {clientName}.</h1>
            <p>Your SEO program is moving in the right direction. Here is the clearest view of your performance and the work completed by your team.</p>
          </div>
          <div className="heading-actions">
            <button className="button"><Download size={14} /> Export view</button>
          </div>
        </div>

        <div className="range-bar">
          <div className="range-tabs" aria-label="Date range">
            {ranges.map((item) => <button key={item} className={`range-tab${range === item ? " active" : ""}`} onClick={() => setRange(item)}>{item}</button>)}
          </div>
          <div className="sync-note"><span className="dot" /> Last synced Nov 3, 2026 · Google data has a 2–3 day delay</div>
        </div>

        <div className="metrics-grid">
          <MetricCard label="Organic traffic" value={metrics.organicTraffic.value.toLocaleString()} trend={formatMetricTrend(getMetricTrend(metrics.organicTraffic))} icon={<Globe2 size={15} />} tone="orange" positive />
          <MetricCard label="Search impressions" value={`${(metrics.impressions.value / 1000).toFixed(1)}K`} trend={formatMetricTrend(getMetricTrend(metrics.impressions))} icon={<TrendingUp size={15} />} positive />
          <MetricCard label="Keywords in top 10" value={metrics.topTen.value.toLocaleString()} trend={formatMetricTrend(getMetricTrend(metrics.topTen))} icon={<Sparkles size={15} />} tone="teal" positive />
          <MetricCard label="GBP calls generated" value={metrics.calls.value.toLocaleString()} trend={formatMetricTrend(getMetricTrend(metrics.calls))} icon={<MapPin size={15} />} tone="teal" positive />
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
              {activities.map((activity) => <div className="list-row" key={activity.id}><div className="list-icon">{activity.status === "COMPLETED" ? <CheckCircle2 size={15} /> : <Clock3 size={15} />}</div><div className="list-body"><div className="list-title">{activity.title}</div><div className="list-meta">{activity.category} · {activity.date}</div></div><div className={`status ${activity.status === "COMPLETED" ? "complete" : "progress"}`}>{activity.status === "COMPLETED" ? "Completed" : "In progress"}</div></div>)}
            </div>
          </section>
          <section className="card panel" id="reports">
            <div className="panel-heading"><div><h2>Recent reports</h2><p>Performance summaries from your team</p></div><a className="panel-link" href="#reports">View all</a></div>
            <div className="mini-list">
              {reports.map((report) => <div className="report-row" key={report.id}><div className="file-icon"><FileText size={16} /></div><div><div className="report-name">{report.title}</div><div className="report-meta">{report.type} · {report.period}</div></div><Download className="download" size={15} /></div>)}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function MetricCard({ label, value, trend, icon, tone, positive }: { label: string; value: string; trend: string; icon: React.ReactNode; tone?: string; positive?: boolean }) {
  return <article className="card metric-card"><div className="metric-top"><span className="metric-label">{label}</span><span className={`metric-icon ${tone ?? ""}`}>{icon}</span></div><div className="metric-value">{value}</div><div className="metric-foot"><span className={positive ? "trend-up" : "trend-down"}>{positive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />} {trend}</span><span className="metric-period">vs previous period</span></div></article>;
}
