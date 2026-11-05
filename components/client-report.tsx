"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowDownRight, ArrowUpRight, CheckCircle2, CircleAlert, FileText, Info, Lightbulb, Printer, ShieldCheck, Target } from "lucide-react";
import type { ReportMetricView, ReportPeriodRow, ReportViewModel } from "../lib/reports/types";

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

export function ClientReport({ report }: { report: ReportViewModel }) {
  return <main className="client-report" style={{ "--report-accent": report.client.brandAccent } as React.CSSProperties}>
    <div className="report-toolbar"><Link className="report-back" href="/portal/reports">← Report Center</Link><div className="report-toolbar-actions"><span className="report-published-label"><CheckCircle2 size={13} /> Published report</span><button className="button" type="button" onClick={() => window.print()}><Printer size={14} /> Print / PDF</button></div></div>

    <section className="report-cover report-page"><Image className="report-cover-art" src="/branding/ai-rankers/cover_banner.png" alt="" fill priority sizes="100vw" /><div className="report-cover-overlay" /><div className="report-cover-content"><div className="report-cover-logo"><Image src="/branding/ai-rankers/brand_logo.png" alt="The AI Rankers" width={250} height={48} priority /></div><div className="report-cover-copy"><p className="report-cover-kicker">SEO · local visibility · execution</p><h1>{report.report.title}</h1><p className="report-cover-client">{report.client.businessName}</p><p className="report-cover-period">{report.period.label}</p></div><div className="report-cover-meta"><span>Prepared by The AI Rankers</span><span>Published {new Date(report.report.publishedAt).toLocaleDateString("en-US", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" })}</span><span>{report.period.lastDataContext}</span></div></div></section>

    <section className="report-page report-section report-summary-section"><ReportSectionHeading eyebrow="01 · Executive summary" title={report.summary.title} description={report.summary.body} /><div className="report-health-row"><div className="report-health-status"><span className="health-orbit">✓</span><div><span>Overall SEO health</span><strong>{report.summary.status === "ON_TRACK" ? "On track" : report.summary.status === "ATTENTION" ? "Needs attention" : "Awaiting data"}</strong></div></div><div className="report-summary-points"><div><strong>What went well</strong>{report.summary.highlights.map((item) => <p key={item}><CheckCircle2 size={13} /> {item}</p>)}</div><div><strong>What needs attention</strong>{report.summary.risks.map((item) => <p key={item}><CircleAlert size={13} /> {item}</p>)}</div></div></div><div className="report-next-actions"><div className="report-next-heading"><Target size={15} /><strong>Recommended next actions</strong></div>{report.summary.nextActions.map((item, index) => <div key={item} className="report-next-action"><span>{String(index + 1).padStart(2, "0")}</span><p>{item}</p></div>)}</div></section>

    <section className="report-page report-section"><ReportSectionHeading eyebrow="02 · Performance snapshot" title="The signals behind the story." description="Current values, previous-period movement, source context, and definitions stay together so each number can be understood before it is acted on." /><div className="report-kpi-grid">{report.kpis.map((metric) => <ReportKpi key={metric.key} metric={metric} />)}</div></section>

    <section className="report-page report-section"><ReportSectionHeading eyebrow="03 · Website SEO" title="Organic visibility is building." description="The website SEO view connects demand, discoverability, and keyword coverage across the reporting periods available in this report." /><div className="report-insight-callout"><Lightbulb size={16} /><p><strong>What to take from this:</strong> the strongest opportunity is to connect the pages gaining attention with the service and conversion actions that matter to {report.client.businessName}.</p></div><ReportTrendChart rows={report.websiteSeo.rows} /><div className="report-table-wrap"><table className="report-table"><thead><tr><th>Period</th><th>Organic sessions</th><th>Search impressions</th><th>Top-10 keywords</th></tr></thead><tbody>{report.websiteSeo.rows.map((row, index) => <tr key={row.periodStart}><td><strong>{row.periodLabel}</strong><small>{index === report.websiteSeo.rows.length - 1 ? "Latest available" : "Historical"}</small></td><td>{row.organicTraffic?.toLocaleString() ?? "Not connected"}</td><td>{row.impressions?.toLocaleString() ?? "Not connected"}</td><td>{row.topTen?.toLocaleString() ?? "Not connected"}</td></tr>)}</tbody></table></div><div className="report-two-column-notes"><div><strong>Highlights</strong>{report.websiteSeo.highlights.map((item) => <p key={item}><CheckCircle2 size={13} /> {item}</p>)}</div><div><strong>Opportunities to investigate</strong>{report.websiteSeo.opportunities.map((item) => <p key={item}><Info size={13} /> {item}</p>)}</div></div></section>

    <section className="report-page report-section"><ReportSectionHeading eyebrow="04 · Local SEO / GBP" title="Local visibility is part of the growth story." description={report.localSeo.summary} /><div className="report-local-grid">{report.localSeo.metrics.map((metric) => <div className="report-local-card" key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong><small><span className={`freshness-indicator ${metric.status.toLowerCase()}`} /> {metric.status === "PRESENTATION" ? `${sourceLabel(metric.source)} · presentation dataset` : `${sourceLabel(metric.source)} · ${metric.status.toLowerCase()}`}</small></div>)}</div><div className="report-unavailable-note"><Info size={14} /><span>Views, website clicks, directions, reviews, sentiment, and local ranking detail are prepared as report slots but remain unavailable until the relevant GBP/location sources are connected.</span></div></section>

    <section className="report-page report-section"><ReportSectionHeading eyebrow="05 · Work completed" title="Progress clients can see." description="The work log connects the agency’s delivery to the performance story without exposing internal notes." /><div className="report-activity-list">{report.activities.length === 0 ? <ReportEmpty message="No client-visible activities were published for this period." /> : report.activities.filter((activity) => activity.clientVisible).map((activity) => <div className="report-activity-row" key={activity.id}><div className="report-activity-date">{activity.date}</div><div className="report-activity-icon"><CheckCircle2 size={15} /></div><div className="report-activity-body"><div className="report-activity-top"><strong>{activity.title}</strong><span>{activity.type} · {activity.status}</span></div><p>{activity.description}</p><small>Owner: {activity.owner}</small></div></div>)}</div></section>

    <section className="report-page report-section"><ReportSectionHeading eyebrow="06 · Recommendations" title="What should happen next." description="These are manual, evidence-aware recommendations for the current report—not automated guarantees or unsupported attribution claims." /><div className="recommendation-list">{report.recommendations.map((recommendation) => <article className="recommendation-card" key={recommendation.title}><div className="recommendation-top"><span className={`priority-badge priority-${recommendation.priority.toLowerCase()}`}>{recommendation.priority}</span><span className="recommendation-status">{recommendation.status}</span></div><h3>{recommendation.title}</h3><p>{recommendation.explanation}</p><div className="recommendation-evidence"><strong>Evidence</strong><span>{recommendation.evidence}</span></div><div className="recommendation-meta"><span>Impact <strong>{recommendation.impact}</strong></span><span>Effort <strong>{recommendation.effort}</strong></span></div></article>)}</div></section>

    <section className="report-page report-section report-methodology"><ReportSectionHeading eyebrow="07 · Data confidence and methodology" title="Trust is part of the report." description="The report separates what is measured from what is still waiting for a connected source." /><div className="report-source-grid">{report.dataSources.map((source) => <div className="report-source-row" key={source.name}><div><strong>{source.name}</strong><span>{source.source}</span></div><div><span className="freshness-indicator presentation" />{source.status === "PRESENTATION" ? "Presentation dataset" : source.status}</div><div><span>Last successful sync</span><strong>{source.lastSuccessfulSync}</strong></div></div>)}</div><div className="methodology-grid"><div><ShieldCheck size={15} /><div><strong>Metric definitions</strong>{report.methodology.map((item) => <p key={item}>{item}</p>)}</div></div><div><Info size={15} /><div><strong>Attribution limitations</strong><p>Performance movement is associated with the reporting period and available work history. This report does not claim that one activity caused revenue or lead growth unless a verified outcome source is connected.</p></div></div></div></section>

    <section className="report-page report-section report-appendix"><ReportSectionHeading eyebrow="08 · Appendix" title="Supporting detail." description="The first report template keeps a place for the detailed tables that will be connected to live provider data." /><div className="appendix-list">{report.appendix.map((item) => <div key={item.label}><FileText size={15} /><span>{item.label}</span><strong>{item.value}</strong></div>)}</div></section>

    <footer className="report-footer"><Image src="/branding/ai-rankers/logo-mark-navy.png" alt="" width={20} height={20} /><div><strong>The AI Rankers</strong><span>Client performance reporting · {report.client.businessName}</span></div><span>Prepared for client review</span></footer>
  </main>;
}

function ReportSectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="report-section-heading"><p className="eyebrow">{eyebrow}</p><h2>{title}</h2><p>{description}</p></div>;
}

function ReportKpi({ metric }: { metric: ReportMetricView }) {
  const positive = metric.direction === "POSITIVE";
  return <article className="report-kpi"><div className="report-kpi-top"><span>{metric.label}</span><span className="report-source-pill">{sourceLabel(metric.source)}</span></div><strong>{formatValue(metric.value, metric.format)}</strong><div className={`report-kpi-change ${metric.direction.toLowerCase()}`}>{metric.change === null ? <Info size={12} /> : positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />} {formatChange(metric.change)}</div><p>{metric.definition}</p><small><span className={`freshness-indicator ${metric.status.toLowerCase()}`} /> {metric.status === "PRESENTATION" ? "Presentation dataset" : metric.lastSyncedAt ? `Synced ${metric.lastSyncedAt}` : "Source unavailable"}</small></article>;
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
    <div className="report-chart-header"><div><strong>Performance over time</strong><span>Google Analytics-style trend view · presentation dataset</span></div><label>Metric<select value={selectedKey} onChange={(event) => setSelectedKey(event.target.value as TrendKey)}>{trendOptions.map((item) => <option value={item.key} key={item.key}>{item.label}</option>)}</select></label></div>
    <div className="report-chart-legend"><span><i style={{ backgroundColor: option.color }} /> {option.label}</span><strong>{compactNumber(points.at(-1)?.value ?? 0)} latest</strong></div>
    <div className="report-chart-plot"><svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${option.label} from ${points[0].row.periodLabel} to ${points.at(-1)?.row.periodLabel}`} preserveAspectRatio="none">
      {[0, 1, 2, 3, 4].map((tick) => { const y = top + (chartHeight / 4) * tick; const value = max - (max / 4) * tick; return <g key={tick}><line x1={left} x2={width - right} y1={y} y2={y} className="report-chart-grid-line" /><text x={left - 10} y={y + 3} textAnchor="end" className="report-chart-axis-label">{compactNumber(value)}</text></g>; })}
      <polyline points={line} fill="none" stroke={option.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {chartPoints.map((point) => <g key={point.row.periodStart}><circle cx={point.x} cy={point.y} r="5" fill="white" stroke={option.color} strokeWidth="3" /><text x={point.x} y={height - 12} textAnchor="middle" className="report-chart-axis-label">{point.row.periodLabel}</text><title>{`${point.row.periodLabel}: ${point.value.toLocaleString()}`}</title></g>)}
    </svg></div>
    <p className="report-chart-note">Use the metric selector to switch between demand, discoverability, and tracked keyword coverage. The table below preserves the exact period values for review.</p>
  </div>;
}

function ReportEmpty({ message }: { message: string }) {
  return <div className="report-empty-inline"><FileText size={16} /><span>{message}</span></div>;
}
