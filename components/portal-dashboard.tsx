"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  Filter,
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
import { EmptyState, MetricCard, SectionHeader } from "./ui/primitives";
import { DateRangePicker, getDefaultDateRange, type DateRangeSelection } from "./date-range-picker";
import { GoalHighlights, type PortalGoal } from "./goal-highlights";
import { DashboardControls, defaultDashboardFilters, type DashboardFilterState } from "./dashboard-controls";
import { DecisionIntelligence } from "./decision-intelligence";
import { ClientMessaging } from "./client-messaging";
import { RankedVisibilityList, type VisibilityMetric } from "./ranked-visibility-list";
import { PortalFeedback } from "./portal-feedback";

type PortalDatabaseData = {
  businessName: string;
  brandMark?: string | null;
  brandAccent?: string;
  metrics: {
    organicTraffic?: DemoMetric;
    impressions?: DemoMetric;
    topTen?: DemoMetric;
    calls?: DemoMetric;
  };
  activities: DemoActivity[];
  reports: DemoReport[];
  goals?: PortalGoal[];
};

export function PortalDashboard({ databaseData }: { databaseData?: PortalDatabaseData }) {
  const [dateRange, setDateRange] = useState<DateRangeSelection>(getDefaultDateRange);
  const [selectedReport, setSelectedReport] = useState<DemoReport | null>(null);
  const reportTriggerRef = useRef<HTMLButtonElement | null>(null);
  const metrics = {
    organicTraffic: databaseData?.metrics.organicTraffic ?? demoMetrics.organicTraffic,
    impressions: databaseData?.metrics.impressions ?? demoMetrics.impressions,
    topTen: databaseData?.metrics.topTen ?? demoMetrics.topTen,
    calls: databaseData?.metrics.calls ?? demoMetrics.calls,
  };
  const activities = databaseData?.activities ?? demoActivities;
  const reports = databaseData?.reports ?? demoReports;
  const goals = databaseData?.goals ?? [];
  const clientName = databaseData?.businessName ?? demoClient.businessName;
  const chartData = useMemo(() => {
    const visiblePoints = dateRange.label === "Last 30 days" ? 2 : dateRange.label === "Last 90 days" ? 3 : metrics.organicTraffic.history.length;
    return metrics.organicTraffic.history.slice(-visiblePoints).map((point) => ({ label: point.label, value: point.value }));
  }, [dateRange.label, metrics.organicTraffic.history]);
  const trafficTrend = getMetricTrend(metrics.organicTraffic);
  const keywordTrend = getMetricTrend(metrics.topTen);
  const brandMark = databaseData?.brandMark ?? clientName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const brandAccent = databaseData?.brandAccent ?? "#F26B38";
  const [selectedView, setSelectedView] = useState("Executive overview");
  const [dashboardFilters, setDashboardFilters] = useState<DashboardFilterState>(defaultDashboardFilters);
  const rankedMetrics: VisibilityMetric[] = databaseData ? [
    databaseData.metrics.topTen && { ...databaseData.metrics.topTen, displayLabel: "Top-10 keyword coverage", detail: "Rank source coverage", format: "integer", priority: 1 },
    databaseData.metrics.organicTraffic && { ...databaseData.metrics.organicTraffic, displayLabel: "Organic search sessions", detail: "Acquisition signal", format: "integer", priority: 2 },
    databaseData.metrics.impressions && { ...databaseData.metrics.impressions, displayLabel: "Search visibility", detail: "Search Console reach", format: "compact", priority: 3 },
    databaseData.metrics.calls && { ...databaseData.metrics.calls, displayLabel: "Local inquiry activity", detail: "GBP call signal", format: "integer", priority: 4 },
  ].filter((metric): metric is VisibilityMetric => Boolean(metric)) : [
    { ...metrics.topTen, displayLabel: "Top-10 keyword coverage", detail: "Rank source coverage", format: "integer", priority: 1 },
    { ...metrics.organicTraffic, displayLabel: "Organic search sessions", detail: "Acquisition signal", format: "integer", priority: 2 },
    { ...metrics.impressions, displayLabel: "Search visibility", detail: "Search Console reach", format: "compact", priority: 3 },
    { ...metrics.calls, displayLabel: "Local inquiry activity", detail: "GBP call signal", format: "integer", priority: 4 },
  ];
  const metricDefinitions = [
    { key: "organicTraffic", metric: metrics.organicTraffic, channel: "Organic search", focus: "Traffic" },
    { key: "impressions", metric: metrics.impressions, channel: "Organic search", focus: "Visibility" },
    { key: "topTen", metric: metrics.topTen, channel: "Organic search", focus: "Visibility" },
    { key: "calls", metric: metrics.calls, channel: "Local / GBP", focus: "Demand" },
  ] as const;
  function matchesFilters(definition: (typeof metricDefinitions)[number], filters: DashboardFilterState) {
    const channelMatches = filters.channel === "All channels" || definition.channel === filters.channel;
    const focusMatches = filters.metric === "All KPIs" || definition.focus === filters.metric;
    const sourceMatches = filters.source === "All sources" || definition.metric.source === filters.source;
    return channelMatches && focusMatches && sourceMatches;
  }
  function getFilterResultCount(filters: DashboardFilterState) {
    return metricDefinitions.filter((definition) => matchesFilters(definition, filters)).length;
  }
  const visibleMetricKeys = new Set(metricDefinitions.filter((definition) => matchesFilters(definition, dashboardFilters)).map((definition) => definition.key));
  const visibleRankedMetrics = rankedMetrics.filter((metric) => metric.id === metrics.organicTraffic.id && visibleMetricKeys.has("organicTraffic") || metric.id === metrics.impressions.id && visibleMetricKeys.has("impressions") || metric.id === metrics.topTen.id && visibleMetricKeys.has("topTen") || metric.id === metrics.calls.id && visibleMetricKeys.has("calls"));

  return (
    <AppShell mode="portal" clientName={clientName} brandMark={brandMark} brandAccent={brandAccent} activeNav="Overview">
      <div className="content">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Client portal / Reporting period</p>
            <h1>SEO performance</h1>
            <p>{clientName} · November 2026 · Organic search and local SEO metrics.</p>
          </div>
          <div className="heading-actions">
            <button className="button" onClick={() => window.print()}><Download size={14} /> Print summary</button>
          </div>
        </div>

        <section className="card executive-hero" id="summary" aria-labelledby="executive-summary-title">
          <div className="executive-copy">
            <div className="executive-label"><span className="client-brand-mark" style={{ backgroundColor: brandAccent }}>{brandMark}</span> Performance summary <span>·</span> November 2026</div>
            <h2 id="executive-summary-title">Period comparison</h2>
            <p>Organic search and local SEO metrics compared with the previous reporting period. Source status is shown beside each value.</p>
            <div className="executive-points">
              <div><CheckCircle2 size={16} /><span><strong>{formatMetricTrend(trafficTrend)} organic traffic</strong><small>vs previous period</small></span></div>
              <div><CheckCircle2 size={16} /><span><strong>{metrics.topTen.value} top-10 keywords</strong><small>{formatMetricTrend(keywordTrend)} this period</small></span></div>
            </div>
          </div>
          <div className="executive-signal"><div className="signal-orbit"><span>✓</span></div><p>Data status</p><strong>Presentation data</strong><small>Provider connections pending</small></div>
        </section>

        <div className="range-bar">
          <DateRangePicker value={dateRange} onApply={setDateRange} />
          <div className="sync-note"><span className="dot" /> Last synced Nov 3, 2026 · Google data has a 2–3 day delay</div>
        </div>

        <nav className="portal-section-nav" aria-label="Overview sections">
          <a href="#summary">Summary</a>
          <a href="#performance">Performance</a>
          <a href="#goals">Goals</a>
          <a href="#website">Website SEO</a>
          <a href="#gbp">Local SEO</a>
          <a href="#activities">Activities</a>
          <a href="#reports">Reports</a>
          <a href="#communication">Communication</a>
        </nav>

        <DashboardControls onViewChange={setSelectedView} onFiltersChange={setDashboardFilters} getResultCount={getFilterResultCount} />

        {selectedView === "Client tasks" ? <section className="card task-focus-note"><Clock3 size={17} /><div><strong>Task workspace</strong><p>Create a request, set a priority and due date, then review task status in Activities.</p></div><a className="button primary" href="/portal/activities">Open tasks</a></section> : null}

        <div className="metrics-grid" id="performance">
          {visibleMetricKeys.has("organicTraffic") ? <MetricCard label="Organic traffic" value={metrics.organicTraffic.value.toLocaleString()} trend={formatMetricTrend(getMetricTrend(metrics.organicTraffic))} icon={<Globe2 size={15} />} tone="orange" positive /> : null}
          {visibleMetricKeys.has("impressions") ? <MetricCard label="Search impressions" value={`${(metrics.impressions.value / 1000).toFixed(1)}K`} trend={formatMetricTrend(getMetricTrend(metrics.impressions))} icon={<TrendingUp size={15} />} positive /> : null}
          {visibleMetricKeys.has("topTen") ? <MetricCard label="Keywords in top 10" value={metrics.topTen.value.toLocaleString()} trend={formatMetricTrend(getMetricTrend(metrics.topTen))} icon={<Sparkles size={15} />} tone="teal" positive /> : null}
          {visibleMetricKeys.has("calls") ? <MetricCard label="GBP calls generated" value={metrics.calls.value.toLocaleString()} trend={formatMetricTrend(getMetricTrend(metrics.calls))} icon={<MapPin size={15} />} tone="teal" positive /> : null}
          {visibleMetricKeys.size === 0 ? <div className="dashboard-filter-empty"><Filter size={16} /><div><strong>No KPI signals match these filters</strong><p>Clear a filter or choose a broader channel and metric focus.</p></div></div> : null}
        </div>

        <RankedVisibilityList metrics={visibleRankedMetrics} />

        <div className="insight-grid">
          {visibleMetricKeys.has("impressions") || visibleMetricKeys.has("topTen") ? <section className="card insight-card insight-orange">
            <div className="insight-icon"><TrendingUp size={16} /></div>
            <div><p className="insight-label">Period change</p><h2>Organic search metrics</h2><p>Search impressions: {(metrics.impressions.value / 1000).toFixed(1)}K. Keywords in the top 10: {metrics.topTen.value}. Review the period table for the full comparison.</p></div>
          </section> : null}
          {visibleMetricKeys.has("calls") ? <section className="card insight-card insight-teal">
            <div className="insight-icon"><Sparkles size={16} /></div>
            <div><p className="insight-label">Open work</p><h2>Local SEO review</h2><p>Review GBP connection status, profile work, and service-page changes before the next reporting period.</p></div>
          </section> : null}
        </div>

        {visibleMetricKeys.has("organicTraffic") || visibleMetricKeys.has("impressions") || visibleMetricKeys.has("topTen") ? <DecisionIntelligence traffic={metrics.organicTraffic} impressions={metrics.impressions} topTen={metrics.topTen} /> : null}

        <GoalHighlights goals={goals} />

        <div className="dashboard-grid">
          {visibleMetricKeys.has("organicTraffic") ? <section className="card panel" id="website">
            <SectionHeader title="Organic traffic trend" description={`Sessions from organic search · ${dateRange.label.toLowerCase()}`} action={<div className="legend"><span className="legend-line" /> Organic sessions</div>} />
            <TrendChart data={chartData} />
          </section> : null}
          <section className="card panel" id="gbp">
            <SectionHeader title="Delivery status" description="Configured SEO activities" action={<Sparkles size={17} color="#f26b38" />} />
            <div className="progress-row"><span>Profile optimization</span><strong>76%</strong></div>
            <div className="progress-track"><div className="progress-fill" style={{ width: "76%" }} /></div>
            <p className="progress-note">Profile cleanup is complete. Review response and local-content work remains open.</p>
            <div className="progress-row"><span>Monthly deliverables</span><strong>8 / 10</strong></div>
            <div className="progress-track"><div className="progress-fill" style={{ width: "80%", background: "linear-gradient(90deg, #148f83, #70c8bd)" }} /></div>
          </section>
        </div>

        <div className="bottom-grid">
          <section className="card panel" id="activities">
            <SectionHeader title="Recent activity" description="Client-visible SEO work" action={<span className="panel-meta">Latest 3</span>} />
            <div className="mini-list">
              {activities.length > 0 ? activities.map((activity) => <div className="list-row" key={activity.id}><div className="list-icon">{activity.status === "COMPLETED" ? <CheckCircle2 size={15} /> : <Clock3 size={15} />}</div><div className="list-body"><div className="list-title">{activity.title}</div><div className="list-meta">{activity.category} · {activity.date}</div></div><div className={`status ${activity.status === "COMPLETED" ? "complete" : "progress"}`}>{activity.status === "COMPLETED" ? "Completed" : "In progress"}</div></div>) : <EmptyState message="No client-visible activity records are available." />}
            </div>
          </section>
          <section className="card panel" id="reports">
            <SectionHeader title="Published reports" description="Available reporting records" action={<span className="panel-meta">Preview available</span>} />
            <div className="mini-list">
              {reports.length > 0 ? reports.map((report) => <button type="button" className="report-row report-button" key={report.id} onClick={(event) => { reportTriggerRef.current = event.currentTarget; setSelectedReport(report); }} aria-label={`Preview ${report.title}`}><div className="file-icon"><FileText size={16} /></div><div><div className="report-name">{report.title}</div><div className="report-meta">{report.type} · {report.period}</div></div><Download className="download" size={15} /></button>) : <EmptyState message="No published reports are available." />}
            </div>
          </section>
        </div>

        <ClientMessaging />
        <PortalFeedback pagePath="/portal" pageLabel="Portal overview" context={{ view: selectedView, dateRange: dateRange.label }} />
      </div>
      {selectedReport && <ReportPreview report={selectedReport} onClose={() => { setSelectedReport(null); reportTriggerRef.current?.focus(); }} />}
    </AppShell>
  );
}
function ReportPreview({ report, onClose }: { report: DemoReport; onClose: () => void }) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section className="report-modal" role="dialog" aria-modal="true" aria-labelledby="report-preview-title" onClick={(event) => event.stopPropagation()}>
        <div className="modal-heading"><div><p className="eyebrow">Client report</p><h2 id="report-preview-title">{report.title}</h2><p>{report.type} · {report.period}</p></div><button ref={closeButtonRef} type="button" className="icon-button" aria-label="Close report preview" onClick={onClose}><X size={16} /></button></div>
        <div className="report-preview-note"><CheckCircle2 size={16} /><div><strong>Published report</strong><p>Reporting-period metrics, activity records, and source status.</p></div></div>
        <div className="report-preview-grid"><div><span>Report type</span><strong>{report.type}</strong></div><div><span>Reporting period</span><strong>{report.period}</strong></div><div><span>Workspace</span><strong>Client presentation</strong></div></div>
        <div className="modal-actions"><button type="button" className="button" onClick={onClose}>Close</button><button type="button" className="button primary" onClick={() => window.print()}><Download size={14} /> Print report</button></div>
      </section>
    </div>
  );
}

