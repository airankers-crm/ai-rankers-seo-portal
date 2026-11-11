"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowDownRight, ArrowUpRight, CheckCircle2, CircleAlert, FileText, Flag, Info, Lightbulb, Printer, ShieldCheck, Sparkles, Target } from "lucide-react";
import { DateRangePicker, type DateRangeSelection } from "./date-range-picker";
import { PortalFeedback } from "./portal-feedback";
import type { ReportGoalView, ReportMetricView, ReportPeriodRow, ReportSearchDetailRow, ReportViewModel } from "../lib/reports/types";

function formatValue(value: number | null, format: ReportMetricView["format"]) {
  if (value === null) return "Not connected";
  if (format === "PERCENT") return `${value.toFixed(1)}%`;
  if (format === "CURRENCY") return `$${value.toLocaleString()}`;
  if (format === "DECIMAL") return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return value.toLocaleString();
}

function formatChange(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "No comparison";
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function sourceLabel(source: string) {
  return source === "DATAFORSEO" ? "Rank source" : source;
}

function templateSection(report: ReportViewModel, key: string, fallback: string) {
  return report.template?.sections.find((section) => section.key === key)?.label ?? fallback;
}

function templateVisible(report: ReportViewModel, key: string) {
  return report.template?.sections.find((section) => section.key === key)?.visible ?? true;
}

export function ClientReport({ report }: { report: ReportViewModel }) {
  const [dateRange, setDateRange] = useState<DateRangeSelection>(() => {
    const now = new Date();
    return { label: "This year", start: new Date(now.getFullYear(), 0, 1), end: now, compare: "Previous period" };
  });
  const visibleRows = report.websiteSeo.rows.filter((row) => {
    const periodStart = new Date(row.periodStart).getTime();
    return periodStart >= dateRange.start.getTime() && periodStart <= dateRange.end.getTime();
  });
  const visibleKpis = report.kpis.map((metric) => {
    const key = metric.key === "ga4-organic-sessions" ? "organicTraffic" : metric.key === "gsc-impressions" ? "impressions" : metric.key === "kw-top10" ? "topTen" : null;
    if (!key || !visibleRows.length) return metric;
    const current = visibleRows.at(-1)?.[key] ?? null;
    const previous = visibleRows.at(-2)?.[key] ?? null;
    const change = current !== null && previous !== null && previous !== 0 ? ((current - previous) / Math.abs(previous)) * 100 : null;
    return { ...metric, value: current, previousValue: previous, change, direction: change === null ? "NEUTRAL" as const : change >= 0 ? "POSITIVE" as const : "NEGATIVE" as const };
  });
  const comparisonText = dateRange.compare === "None" ? "No comparison selected" : `Compared with ${dateRange.compare.toLowerCase()}`;

  return <main className="client-report" style={{ "--report-accent": report.client.brandAccent } as React.CSSProperties}>
    <div className="report-toolbar"><Link className="report-back" href="/portal/reports">← Report Center</Link><div className="report-toolbar-actions"><span className="report-published-label"><CheckCircle2 size={13} /> Published report</span><button className="button" type="button" onClick={() => window.print()}><Printer size={14} /> Print / PDF</button></div></div>
    <div className="report-range-bar"><div className="report-range-context"><span>Report view</span><strong>{dateRange.label}</strong><small>{comparisonText} · {visibleRows.length} periods available</small></div><DateRangePicker value={dateRange} onApply={setDateRange} /></div>

    <section className="report-cover report-page"><Image className="report-cover-art" src="/branding/ai-rankers/cover_banner.png" alt="" fill priority sizes="100vw" /><div className="report-cover-overlay" /><div className="report-cover-content"><div className="report-cover-logo"><Image src="/branding/ai-rankers/brand_logo.png" alt="The AI Rankers" width={250} height={48} priority /></div><div className="report-cover-copy"><p className="report-cover-kicker">SEO · local visibility · execution</p><h1>{report.report.title}</h1><p className="report-cover-client">{report.client.businessName}</p><p className="report-cover-period">{report.period.label}</p></div><div className="report-cover-meta"><span>Prepared by The AI Rankers</span><span>Published {new Date(report.report.publishedAt).toLocaleDateString("en-US", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" })}</span><span>{report.period.lastDataContext}</span></div></div></section>

    <section className={`report-page report-section report-summary-section${templateVisible(report, "summary") ? "" : " report-section-hidden"}`}><ReportSectionHeading eyebrow="01 · Executive summary" title={templateSection(report, "summary", report.summary.title)} description={report.summary.body} /><div className="report-health-row"><div className="report-health-status"><span className="health-orbit">✓</span><div><span>Overall SEO status</span><strong>{report.summary.status === "ON_TRACK" ? "On track" : report.summary.status === "ATTENTION" ? "Needs attention" : "Awaiting data"}</strong></div></div><div className="report-summary-points"><div><strong>Measured changes</strong>{report.summary.highlights.map((item) => <p key={item}><CheckCircle2 size={13} /> {item}</p>)}</div><div><strong>Data and delivery gaps</strong>{report.summary.risks.map((item) => <p key={item}><CircleAlert size={13} /> {item}</p>)}</div></div></div><div className="report-next-actions"><div className="report-next-heading"><Target size={15} /><strong>Recommended actions</strong></div>{report.summary.nextActions.map((item, index) => <div key={item} className="report-next-action"><span>{String(index + 1).padStart(2, "0")}</span><p>{item}</p></div>)}</div></section>

    <ReportCrmCoverage crm={report.crm} />

    <section className={`report-page report-section${templateVisible(report, "scorecard") ? "" : " report-section-hidden"}`}><ReportSectionHeading eyebrow="03 · Performance snapshot" title={templateSection(report, "scorecard", "KPI scorecard")} description="Current value, period comparison, source, and metric definition for the selected reporting range." /><div className="report-kpi-grid">{visibleKpis.map((metric) => <ReportKpi key={metric.key} metric={metric} />)}</div><ReportSignalMovement metrics={visibleKpis} /></section>

    <section className={`report-page report-section${templateVisible(report, "seo-performance") ? "" : " report-section-hidden"}`}><ReportSectionHeading eyebrow="04 · Website SEO" title={templateSection(report, "seo-performance", "Website SEO performance")} description="Organic sessions, Search Console impressions, and keyword coverage in the selected reporting range." /><div className="report-insight-callout"><Lightbulb size={16} /><p><strong>Review:</strong> compare service-page metrics with related conversion actions before assigning delivery work for {report.client.businessName}.</p></div><ReportTrendChart rows={visibleRows} /><div className="report-table-wrap"><table className="report-table"><thead><tr><th>Period</th><th>Organic sessions</th><th>Search impressions</th><th>Top-10 keywords</th></tr></thead><tbody>{visibleRows.length === 0 ? <tr><td colSpan={4}>No periods match this range. Choose a broader reporting range.</td></tr> : visibleRows.map((row, index) => <tr key={row.periodStart}><td><strong>{row.periodLabel}</strong><small>{index === visibleRows.length - 1 ? "Latest available" : "Historical"}</small></td><td>{row.organicTraffic?.toLocaleString() ?? "Not connected"}</td><td>{row.impressions?.toLocaleString() ?? "Not connected"}</td><td>{row.topTen?.toLocaleString() ?? "Not connected"}</td></tr>)}</tbody></table></div><ReportSearchDetail queryRows={report.websiteSeo.queryRows} pageRows={report.websiteSeo.pageRows} /><div className="report-two-column-notes"><div><strong>Metric highlights</strong>{report.websiteSeo.highlights.map((item) => <p key={item}><CheckCircle2 size={13} /> {item}</p>)}</div><div><strong>Review items</strong>{report.websiteSeo.opportunities.map((item) => <p key={item}><Info size={13} /> {item}</p>)}</div></div></section>

    <section className={`report-page report-section report-goals-section${templateVisible(report, "goals") ? "" : " report-section-hidden"}`}><ReportSectionHeading eyebrow="05 · Goals and milestones" title={templateSection(report, "goals", "Target status")} description="Current values, targets, and published milestones for the client workspace." />{report.goals.length === 0 ? <div className="report-chart-empty"><Flag size={15} /><span>No client goals have been published for this report yet.</span></div> : <div className="report-goal-grid">{report.goals.map((goal) => <ReportGoalCard goal={goal} key={goal.id} />)}</div>}</section>

    <section className={`report-page report-section${templateVisible(report, "discovery") && templateVisible(report, "customer-actions") && templateVisible(report, "profile-trend") && templateVisible(report, "results-by-period") && templateVisible(report, "reputation") ? "" : " report-section-hidden"}`}><ReportSectionHeading eyebrow="06 · Local SEO / GBP" title={templateSection(report, "discovery", "Google Business Profile")} description={report.localSeo.summary} /><div className="report-local-grid">{report.localSeo.metrics.map((metric) => <div className="report-local-card" key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong><small><span className={`freshness-indicator ${metric.status.toLowerCase()}`} /> {metric.status === "PRESENTATION" ? `${sourceLabel(metric.source)} · presentation dataset` : `${sourceLabel(metric.source)} · ${metric.status.toLowerCase()}`}</small></div>)}</div><div className="report-unavailable-note"><Info size={14} /><span>Views, website clicks, directions, reviews, sentiment, and local ranking detail require connected GBP and location sources.</span></div></section>

    <section className="report-page report-section"><ReportSectionHeading eyebrow="07 · Work completed" title="Client-visible delivery" description="Completed delivery records with status, date, and owner. Internal notes are not shown." /><div className="report-activity-list">{report.activities.length === 0 ? <ReportEmpty message="No client-visible activities were published for this period." /> : report.activities.filter((activity) => activity.clientVisible).map((activity) => <div className="report-activity-row" key={activity.id}><div className="report-activity-date">{activity.date}</div><div className="report-activity-icon"><CheckCircle2 size={15} /></div><div className="report-activity-body"><div className="report-activity-top"><strong>{activity.title}</strong><span>{activity.type} · {activity.status}</span></div><p>{activity.description}</p><small>Owner: {activity.owner}</small></div></div>)}</div></section>

    <section className={`report-page report-section${templateVisible(report, "recommendations") ? "" : " report-section-hidden"}`}><ReportSectionHeading eyebrow="08 · Recommendations" title={templateSection(report, "recommendations", "Recommended actions")} description="Manual recommendations based on available metrics and source coverage. They do not represent automated guarantees or attribution claims." /><div className="recommendation-list">{report.recommendations.map((recommendation) => <article className="recommendation-card" key={recommendation.title}><div className="recommendation-top"><span className={`priority-badge priority-${recommendation.priority.toLowerCase()}`}>{recommendation.priority}</span><span className="recommendation-status">{recommendation.status}</span></div><h3>{recommendation.title}</h3><p>{recommendation.explanation}</p><div className="recommendation-evidence"><strong>Evidence</strong><span>{recommendation.evidence}</span></div><div className="recommendation-meta"><span>Impact <strong>{recommendation.impact}</strong></span><span>Effort <strong>{recommendation.effort}</strong></span></div></article>)}</div></section>

    <section className="report-page report-section report-methodology"><ReportSectionHeading eyebrow="09 · Data sources and methodology" title="Source coverage" description="Metric source, freshness, methodology, and current coverage limits." /><div className="report-source-grid">{report.dataSources.map((source) => <div className="report-source-row" key={source.name}><div><strong>{source.name}</strong><span>{source.source}</span></div><div><span className="freshness-indicator presentation" />{source.status === "PRESENTATION" ? "Presentation dataset" : source.status}</div><div><span>Last successful sync</span><strong>{source.lastSuccessfulSync}</strong></div></div>)}</div><div className="methodology-grid"><div><ShieldCheck size={15} /><div><strong>Metric definitions</strong>{report.methodology.map((item) => <p key={item}>{item}</p>)}</div></div><div><Info size={15} /><div><strong>Attribution limitations</strong><p>Performance movement is associated with the reporting period and available work history. This report does not claim that one activity caused revenue or lead growth unless a verified outcome source is connected.</p></div></div></div></section>

    <section className="report-page report-section report-appendix"><ReportSectionHeading eyebrow="10 · Appendix" title="Supporting detail" description="Supporting tables and provider coverage for this report." /><div className="appendix-list">{report.appendix.map((item) => <div key={item.label}><FileText size={15} /><span>{item.label}</span><strong>{item.value}</strong></div>)}</div></section>

    <PortalFeedback pagePath={`/portal/reports/${report.report.id}`} pageLabel="Published report" context={{ reportId: report.report.id, reportTitle: report.report.title, period: report.period.label, range: dateRange.label }} />
    <footer className="report-footer"><Image className="report-footer-logo" src="/branding/ai-rankers/brand_logo.png" alt="The AI Rankers" width={128} height={41} /><div><strong>The AI Rankers</strong><span>Client performance reporting · {report.client.businessName}</span></div><span>Prepared for client review</span></footer>
  </main>;
}

function ReportSectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="report-section-heading"><p className="eyebrow">{eyebrow}</p><h2>{title}</h2><p>{description}</p></div>;
}

function ReportCrmCoverage({ crm }: { crm: ReportViewModel["crm"] }) {
  return <section className="report-page report-section report-crm-section"><ReportSectionHeading eyebrow="02 · CRM coverage" title="CRM system coverage" description="Available records and data connections from visibility through verified outcomes." /><div className="report-lifecycle" aria-label="CRM lifecycle coverage">{crm.lifecycle.map((stage, index) => <article className="report-lifecycle-stage" key={stage.label}><div className="report-lifecycle-stage-top"><span>{String(index + 1).padStart(2, "0")}</span><span className={`report-lifecycle-status ${stage.status.toLowerCase()}`}>{stage.status === "NOT_CONNECTED" ? "Not connected" : stage.status === "PARTIAL" ? "Partial" : "Available"}</span></div><h3>{stage.label}</h3><p>{stage.detail}</p><small>{stage.source}</small></article>)}</div><div className="report-crm-notes"><div><strong>Available in this report</strong>{crm.availableNow.map((item) => <p key={item}><CheckCircle2 size={13} /> {item}</p>)}</div><div><strong>Required connections</strong>{crm.nextConnections.map((item) => <p key={item}><Info size={13} /> {item}</p>)}</div></div></section>;
}

function ReportKpi({ metric }: { metric: ReportMetricView }) {
  const positive = metric.direction === "POSITIVE";
  return <article className="report-kpi"><div className="report-kpi-top"><span>{metric.label}</span><span className="report-source-pill">{sourceLabel(metric.source)}</span></div><strong>{formatValue(metric.value, metric.format)}</strong><div className={`report-kpi-change ${metric.direction.toLowerCase()}`}>{metric.change === null ? <Info size={12} /> : positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />} {formatChange(metric.change)}</div><p>{metric.definition}</p><small><span className={`freshness-indicator ${metric.status.toLowerCase()}`} /> {metric.status === "PRESENTATION" ? "Presentation dataset" : metric.lastSyncedAt ? `Synced ${metric.lastSyncedAt}` : "Source unavailable"}</small></article>;
}

function ReportSignalMovement({ metrics }: { metrics: ReportMetricView[] }) {
  const maxMovement = Math.max(...metrics.map((metric) => Math.abs(metric.change ?? 0)), 1);
  return <div className="report-signal-movement"><div className="report-signal-heading"><div><strong>Signal movement</strong><span>Relative change in the selected reporting range</span></div><span className="report-signal-note">Source-aware comparison</span></div><div className="report-signal-grid">{metrics.map((metric) => { const movement = metric.change === null ? 0 : Math.min(100, Math.max(8, Math.abs(metric.change) / maxMovement * 100)); const tone = metric.direction.toLowerCase(); return <article className="report-signal-card" key={metric.key}><div className="report-signal-card-top"><span>{metric.label}</span><strong className={tone}>{formatChange(metric.change)}</strong></div><div className="report-signal-track"><span className={tone} style={{ width: `${metric.change === null ? 0 : movement}%` }} /></div><small>{metric.change === null ? "A second period is needed for comparison" : `${sourceLabel(metric.source)} · ${metric.direction === "POSITIVE" ? "moving up" : metric.direction === "NEGATIVE" ? "moving down" : "stable"}`}</small></article>; })}</div></div>;
}

type SearchDetailMode = "queries" | "pages";

function ReportSearchDetail({ queryRows, pageRows }: { queryRows: ReportSearchDetailRow[]; pageRows: ReportSearchDetailRow[] }) {
  const [mode, setMode] = useState<SearchDetailMode>("queries");
  const rows = mode === "queries" ? queryRows : pageRows;
  return <div className="report-detail-panel"><div className="report-detail-header"><div><strong>Search detail</strong><span>Performance by query and landing page</span></div><span className="report-detail-status">Presentation dataset</span></div><div className="report-detail-tabs" role="tablist" aria-label="Search detail views"><button type="button" role="tab" aria-selected={mode === "queries"} className={mode === "queries" ? "active" : ""} onClick={() => setMode("queries")}>Search queries</button><button type="button" role="tab" aria-selected={mode === "pages"} className={mode === "pages" ? "active" : ""} onClick={() => setMode("pages")}>Landing pages</button></div><div className="report-table-wrap"><table className="report-table report-detail-table"><caption className="sr-only">{mode === "queries" ? "Search query performance" : "Landing page performance"}</caption><thead><tr><th>{mode === "queries" ? "Search query" : "Landing page"}</th><th>Clicks</th><th>Impressions</th><th>CTR</th><th>Avg. position</th></tr></thead><tbody>{rows.length === 0 ? <tr><td colSpan={5}>Detail rows will appear when Search Console is connected.</td></tr> : rows.map((row) => <tr key={row.label}><td><strong>{row.label}</strong><small>Presentation dataset</small></td><td>{row.clicks?.toLocaleString() ?? "Not connected"}</td><td>{row.impressions?.toLocaleString() ?? "Not connected"}</td><td>{row.ctr === null ? "Not connected" : `${row.ctr.toFixed(1)}%`}</td><td>{row.position === null ? "Not connected" : row.position.toFixed(1)}</td></tr>)}</tbody></table></div><p className="report-detail-note">Connected Search Console query and page records will replace these presentation rows when the source is available.</p></div>;
}

type TrendKey = "organicTraffic" | "impressions" | "topTen";

const trendOptions: { key: TrendKey; label: string; color: string }[] = [
  { key: "organicTraffic", label: "Organic sessions", color: "#1479e9" },
  { key: "impressions", label: "Search impressions", color: "#7c3aed" },
  { key: "topTen", label: "Top-10 keywords", color: "#f26b38" },
];

function chartValue(row: ReportPeriodRow, key: TrendKey) {
  return row[key];
}

function compactNumber(value: number) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}m`;
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  return value.toLocaleString();
}

function ReportTrendChart({ rows }: { rows: ReportPeriodRow[] }) {
  const [selectedKey, setSelectedKey] = useState<TrendKey>("organicTraffic");
  const option = trendOptions.find((item) => item.key === selectedKey) ?? trendOptions[0];
  const points = rows.map((row) => ({ row, value: chartValue(row, option.key) })).filter((item): item is { row: ReportPeriodRow; value: number } => item.value !== null);

  if (!points.length) return <div className="report-chart-empty"><Info size={15} /><span>Trend chart will appear when a connected source provides period-level values.</span></div>;

  const width = 760;
  const height = 250;
  const left = 48;
  const right = 18;
  const top = 20;
  const bottom = 38;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const max = Math.max(...points.map((point) => point.value), 1);
  const step = points.length === 1 ? 0 : chartWidth / (points.length - 1);
  const chartPoints = points.map((point, index) => ({ ...point, x: left + step * index, y: top + chartHeight - (point.value / max) * chartHeight }));
  const line = chartPoints.map((point) => `${point.x},${point.y}`).join(" ");

  return <div className="report-trend-chart" aria-label={`${option.label} trend chart`}>
    <div className="report-chart-header"><div><strong>Performance over time</strong><span>Period trend · presentation dataset</span></div><label>Metric<select value={selectedKey} onChange={(event) => setSelectedKey(event.target.value as TrendKey)}>{trendOptions.map((item) => <option value={item.key} key={item.key}>{item.label}</option>)}</select></label></div>
    <div className="report-chart-legend"><span><i style={{ backgroundColor: option.color }} /> {option.label}</span><strong>{compactNumber(points.at(-1)?.value ?? 0)} latest</strong></div>
    <div className="report-chart-plot"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${option.label} from ${points[0].row.periodLabel} to ${points.at(-1)?.row.periodLabel}`} preserveAspectRatio="none">
      {[0, 1, 2, 3, 4].map((tick) => { const y = top + (chartHeight / 4) * tick; const value = max - (max / 4) * tick; return <g key={tick}><line x1={left} x2={width - right} y1={y} y2={y} className="report-chart-grid-line" /><text x={left - 10} y={y + 3} textAnchor="end" className="report-chart-axis-label">{compactNumber(value)}</text></g>; })}
      <polyline points={line} fill="none" stroke={option.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {chartPoints.map((point) => <g key={point.row.periodStart}><circle cx={point.x} cy={point.y} r="5" fill="white" stroke={option.color} strokeWidth="3" /><text x={point.x} y={height - 12} textAnchor="middle" className="report-chart-axis-label">{point.row.periodLabel}</text><title>{`${point.row.periodLabel}: ${point.value.toLocaleString()}`}</title></g>)}
    </svg></div>
    <p className="report-chart-note">Select a metric to review period values. The table below preserves the displayed values.</p>
  </div>;
}

function reportGoalProgress(goal: ReportGoalView) {
  if (goal.current === null || goal.target === 0) return 0;
  if (goal.condition === "LESS_THAN_OR_EQUAL") return goal.current <= goal.target ? 100 : Math.max(0, Math.min(100, (goal.target / goal.current) * 100));
  if (goal.condition === "EQUALS") return goal.current === goal.target ? 100 : Math.max(0, Math.min(99, (goal.current / goal.target) * 100));
  return Math.max(0, Math.min(100, (goal.current / goal.target) * 100));
}

function reportGoalValue(value: number | null, format: string | null) {
  if (value === null) return "Not connected";
  if (format === "PERCENT") return `${value.toFixed(1)}%`;
  if (format === "CURRENCY") return `$${value.toLocaleString()}`;
  return value.toLocaleString();
}

function ReportGoalCard({ goal }: { goal: ReportGoalView }) {
  const progress = reportGoalProgress(goal);
  const achieved = goal.status === "ACHIEVED" || progress >= 100;
  const status = achieved ? "Achieved" : goal.current === null ? "Awaiting data" : "In progress";
  return <article className="report-goal-card"><div className="report-goal-top"><span className="report-goal-icon"><Target size={15} /></span><span className={`status ${achieved ? "complete" : goal.current === null ? "progress" : "progress"}`}>{status}</span></div><h3>{goal.name}</h3>{goal.description && <p className="report-goal-description">{goal.description}</p>}<div className="report-goal-values"><div><span>Current</span><strong>{reportGoalValue(goal.current, goal.valueFormat)}</strong></div><div><span>{goal.metricName ?? "Target metric"}</span><strong>{Math.round(progress)}%</strong></div><div><span>Target</span><strong>{reportGoalValue(goal.target, goal.valueFormat)}</strong></div></div><div className="report-goal-track"><span className={achieved ? "complete" : ""} style={{ width: `${Math.max(progress, goal.current === null ? 0 : 3)}%` }} /></div><div className="report-goal-foot"><span>{new Date(goal.startDate).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric" })} – {new Date(goal.endDate).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" })}</span><span>{goal.condition === "LESS_THAN_OR_EQUAL" ? "Keep below target" : "Reach target"}</span></div>{goal.annotations.length > 0 && <div className="report-achievements"><div className="report-achievements-heading"><Sparkles size={13} /> Achievement highlights</div>{goal.annotations.map((annotation) => <div className="report-achievement" key={annotation.id}><CheckCircle2 size={14} /><div><strong>{annotation.title}</strong>{annotation.body && <p>{annotation.body}</p>}<small>{new Date(annotation.happenedAt).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" })}</small></div></div>)}</div>}</article>;
}

function ReportEmpty({ message }: { message: string }) {
  return <div className="report-empty-inline"><FileText size={16} /><span>{message}</span></div>;
}
