"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { ArrowDownRight, ArrowUpRight, BarChart3, CheckCircle2, ChevronDown, ListOrdered, MousePointerClick, Percent, Search, SlidersHorizontal, Table2, TrendingUp } from "lucide-react";
import { comparisonOptions, DateRangePicker, type ComparisonOption, type DateRangeSelection } from "./date-range-picker";
import { AppShell } from "./app-shell";
import { PortalFeedback } from "./portal-feedback";

export type WebsiteSeoMetric = {
  key: string;
  label: string;
  value: number | null;
  previousValue: number | null;
  format: "INTEGER" | "DECIMAL" | "PERCENT" | "CURRENCY" | "RANK";
  source: string;
  description: string;
};

export type WebsiteSeoRow = {
  periodStart: string;
  periodLabel: string;
  organicTraffic: number | null;
  searchClicks: number | null;
  impressions: number | null;
  ctr: number | null;
  position: number | null;
  topTen: number | null;
};

type WebsiteMetricKey = "organicTraffic" | "searchClicks" | "impressions" | "ctr" | "position" | "topTen";

const metricDefinitions: Array<{ key: WebsiteMetricKey; label: string; icon: typeof TrendingUp }> = [
  { key: "organicTraffic", label: "Organic sessions", icon: TrendingUp },
  { key: "searchClicks", label: "Search clicks", icon: MousePointerClick },
  { key: "impressions", label: "Search impressions", icon: Search },
  { key: "ctr", label: "Search CTR", icon: Percent },
  { key: "position", label: "Average position", icon: ListOrdered },
  { key: "topTen", label: "Keywords in top 10", icon: BarChart3 },
];

function FilterDropdown({ label, value, displayValue = value, options, onChange }: { label: string; value: string; displayValue?: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function closeOnOutsideClick(event: globalThis.MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return <div className="website-seo-filter-dropdown" ref={dropdownRef}>
    <button type="button" className="website-seo-filter-select" aria-label={label} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((current) => !current)}><span>{displayValue}</span><ChevronDown size={11} /></button>
    {open ? <div className="website-seo-filter-menu" role="listbox" aria-label={label}>{options.map((option) => <button type="button" role="option" aria-selected={option.value === value} key={option.value} className={option.value === value ? "active" : ""} onClick={() => { onChange(option.value); setOpen(false); }}>{option.label}</button>)}</div> : null}
  </div>;
}

function initialRange(): DateRangeSelection {
  const now = new Date();
  return { label: "Last 6 months", start: new Date(now.getFullYear(), now.getMonth() - 5, 1), end: new Date(now.getFullYear(), now.getMonth(), now.getDate()), compare: "Previous period" };
}

function formatMetric(value: number | null, format: WebsiteSeoMetric["format"]) {
  if (value === null) return "—";
  if (format === "PERCENT") return `${value.toFixed(1)}%`;
  if (format === "CURRENCY") return `$${value.toLocaleString()}`;
  if (format === "DECIMAL") return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return value.toLocaleString();
}

function compactMetric(value: number | null, format: WebsiteSeoMetric["format"]) {
  if (value === null) return "—";
  if (format === "INTEGER" && value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return formatMetric(value, format);
}

function metricChange(current: number | null, previous: number | null) {
  if (current === null || previous === null || previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

const trendChartFrame = { width: 700, height: 280, paddingX: 28, plotTop: 26, plotBottom: 238 };

function chartDomain(data: Array<{ value: number }>) {
  const values = data.map((point) => point.value);
  const dataMin = Math.min(...values);
  const dataMax = Math.max(...values);
  const range = Math.max(dataMax - dataMin, 1);
  const breathingRoom = range * 0.12;
  return { min: dataMin - breathingRoom, max: dataMax + breathingRoom };
}

function chartY(value: number, data: Array<{ value: number }>) {
  const domain = chartDomain(data);
  return trendChartFrame.plotBottom - ((value - domain.min) / Math.max(domain.max - domain.min, 1)) * (trendChartFrame.plotBottom - trendChartFrame.plotTop);
}

function chartPath(data: Array<{ value: number }>) {
  if (data.length < 2) return "";
  return data.map((point, index) => {
    const x = trendChartFrame.paddingX + (index / (data.length - 1)) * (trendChartFrame.width - trendChartFrame.paddingX * 2);
    const y = chartY(point.value, data);
    return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");
}

function renderChange(change: number | null) {
  if (change === null) return "No comparison";
  return `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`;
}

export function WebsiteSeoDashboard({ clientName, sectionName = "Website GSC", brandMark, brandAccent, metrics, rows, isDraftPreview = false, isSectionPublished = true }: { clientName: string; sectionName?: string; brandMark: string; brandAccent: string; metrics: WebsiteSeoMetric[]; rows: WebsiteSeoRow[]; isDraftPreview?: boolean; isSectionPublished?: boolean }) {
  const [dateRange, setDateRange] = useState<DateRangeSelection>(initialRange);
  const [query, setQuery] = useState("");
  const [hoveredPoint, setHoveredPoint] = useState<{ label: string; value: number; x: number; y: number } | null>(null);
  const [activeMetricKey, setActiveMetricKey] = useState<WebsiteMetricKey>("organicTraffic");
  const metricMap = useMemo(() => new Map(metrics.map((metric) => [metric.key, metric])), [metrics]);
  const hasReportingData = rows.length > 0 || metrics.some((metric) => metric.value !== null);

  const visibleRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const rangeStart = Date.UTC(dateRange.start.getFullYear(), dateRange.start.getMonth(), dateRange.start.getDate());
    const rangeEnd = Date.UTC(dateRange.end.getFullYear(), dateRange.end.getMonth(), dateRange.end.getDate());
    return rows.filter((row) => {
      const date = new Date(row.periodStart);
      const periodDay = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
      const inRange = periodDay >= rangeStart && periodDay <= rangeEnd;
      return inRange && (!normalizedQuery || row.periodLabel.toLowerCase().includes(normalizedQuery));
    });
  }, [dateRange.end, dateRange.start, query, rows]);

  const latestRow = visibleRows.at(-1);
  const previousRow = visibleRows.at(-2);
  const previousYearRow = latestRow ? (() => { const target = new Date(latestRow.periodStart); target.setUTCFullYear(target.getUTCFullYear() - 1); return rows.find((row) => row.periodStart.slice(0, 7) === target.toISOString().slice(0, 7)); })() : undefined;
  const comparisonRow = dateRange.compare === "Previous year" ? previousYearRow : previousRow;
  const chartRows = visibleRows.filter((row) => row[activeMetricKey] !== null);
  const chartData = chartRows.map((row) => ({ label: row.periodLabel, value: row[activeMetricKey] as number }));
  const emptyChartData = Array.from({ length: 13 }, (_, index) => ({ label: index === 0 ? visibleRows[0]?.periodLabel ?? "Start" : index === 12 ? visibleRows.at(-1)?.periodLabel ?? "Now" : `Point ${index + 1}`, value: 0 }));
  const displayChartData = chartData.length > 1 ? chartData : chartData.length === 1 ? [{ ...chartData[0] }, { label: "Now", value: chartData[0].value }] : emptyChartData;
  const activeMetric = metricDefinitions.find((metric) => metric.key === activeMetricKey);
  const sourceLabels = [...new Set(metrics.map((metric) => metric.source))].join(", ");
  const comparisonAvailable = dateRange.compare !== "None" && Boolean(comparisonRow);
  const comparisonLabel = dateRange.compare === "None" ? "No comparison" : comparisonAvailable ? dateRange.compare === "Previous year" ? "vs previous year" : "vs previous period" : "Comparison unavailable";
  const comparisonPeriodLabel = comparisonRow?.periodLabel ?? "the previous period";
  const insightComparison = dateRange.compare === "None" ? "No comparison" : comparisonAvailable ? `${renderChange(metricChange(latestRow?.organicTraffic ?? null, comparisonRow?.organicTraffic ?? null))} vs ${dateRange.compare === "Previous year" ? "previous year" : comparisonPeriodLabel}` : "No comparison available for the selected range";
  const zeroTableRow: WebsiteSeoRow = { periodStart: "empty", periodLabel: "No published data", organicTraffic: null, searchClicks: null, impressions: null, ctr: null, position: null, topTen: null };
  const visibilityMetrics = [
    { key: "searchClicks" as const, label: "Search clicks", format: "INTEGER" as const },
    { key: "impressions" as const, label: "Search impressions", format: "INTEGER" as const },
    { key: "ctr" as const, label: "Search CTR", format: "PERCENT" as const },
    { key: "position" as const, label: "Average position", format: "DECIMAL" as const },
  ];
  const tableRows = visibleRows.length > 0 ? visibleRows : query ? [] : [zeroTableRow];

  const handleChartMove = (event: MouseEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const relativeX = Math.min(Math.max(event.clientX - bounds.left, 0), bounds.width);
    const chartX = (relativeX / Math.max(bounds.width, 1)) * trendChartFrame.width;
    const index = Math.round(((chartX - trendChartFrame.paddingX) / (trendChartFrame.width - trendChartFrame.paddingX * 2)) * (displayChartData.length - 1));
    const safeIndex = Math.min(displayChartData.length - 1, Math.max(0, index));
    const point = displayChartData[safeIndex];
    if (!point) return;
    const x = trendChartFrame.paddingX + (safeIndex / Math.max(displayChartData.length - 1, 1)) * (trendChartFrame.width - trendChartFrame.paddingX * 2);
    setHoveredPoint({ label: point.label, value: point.value, x, y: chartY(point.value, displayChartData) });
  };

  function resetFilters() {
    setDateRange(initialRange());
    setQuery("");
    setActiveMetricKey("organicTraffic");
  }

  return <AppShell mode="portal" clientName={clientName} brandMark={brandMark} brandAccent={brandAccent} activeNav="Website GSC">
    <div className="content website-seo-final" aria-label={`${sectionName} performance report`}>
      <div className="page-heading website-seo-final-heading">
        <div>
          <h1>Website GSC performance</h1>
          <p>{clientName} · Organic sessions, Google Search Console visibility, and keyword growth.</p>
        </div>
        {isDraftPreview ? <div className="heading-actions"><span className="data-confidence data-confidence-preview"><CheckCircle2 size={13} /> Draft preview · not client-visible</span></div> : !isSectionPublished ? <div className="heading-actions"><span className="data-confidence data-confidence-preview"><BarChart3 size={13} /> Section not published · showing 0 until sync</span></div> : null}
      </div>

      <section className="website-seo-filter-bar" aria-label="Filter Website GSC report">
        <div className="website-seo-filter-title"><span><SlidersHorizontal size={15} /></span><strong>Filter report</strong></div>
        <div className="website-seo-filter-controls">
          <label><span>Date range</span><DateRangePicker value={dateRange} onApply={setDateRange} /></label>
          <label><span>Compare</span><FilterDropdown label="Compare" value={dateRange.compare} options={comparisonOptions.map((option) => ({ value: option, label: option }))} onChange={(value) => setDateRange((current) => ({ ...current, compare: value as ComparisonOption }))} /></label>
          <label className="website-seo-search"><span className="sr-only">Search reporting periods</span><Search size={14} /><input aria-label="Search reporting periods" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search reporting periods" /></label>
          <button className="button website-seo-reset" type="button" onClick={resetFilters}>Reset</button>
        </div>
      </section>

      <>
        <div className="website-seo-kpi-grid">
          {metricDefinitions.map((definition) => {
            const metric = metricMap.get(definition.key);
            const current = latestRow?.[definition.key] ?? null;
            const previous = comparisonRow?.[definition.key] ?? null;
            const change = comparisonAvailable ? metricChange(current, previous) : null;
            const Icon = definition.icon;
             return <article className="card website-seo-kpi" key={definition.key}><div className="website-seo-kpi-top"><span className="website-seo-kpi-label"><Icon size={16} /> {metric?.label ?? definition.label}</span><span className="website-seo-period-badge">{hasReportingData ? "Latest period" : "Awaiting data"}</span><span className={`source-badge${metric ? "" : " pending"}`}>{metric?.source ?? "Awaiting data"}</span></div><strong>{compactMetric(current, metric?.format ?? "INTEGER")}</strong><div className="website-seo-kpi-foot"><span className={change === null || change >= 0 ? "trend-up" : "trend-down"}>{change !== null && (change >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />)} {renderChange(change)}</span>{change !== null ? <span>{comparisonLabel}</span> : <span>Awaiting comparison</span>}</div></article>;
          })}
        </div>

        <div className="website-seo-main-grid">
          <section className="card website-seo-chart-card" aria-labelledby="website-seo-chart-title"><div className="website-seo-card-heading"><h2 id="website-seo-chart-title">SEO performance over time</h2></div><div className="website-seo-chart-tabs" role="tablist" aria-label="Website SEO trend metrics">{metricDefinitions.map((definition) => <button key={definition.key} type="button" role="tab" aria-selected={activeMetricKey === definition.key} className={activeMetricKey === definition.key ? "active" : ""} onClick={() => setActiveMetricKey(definition.key)}>{definition.label}</button>)}</div><div className="website-seo-chart-wrap" role="img" aria-label={`${activeMetric?.label ?? "SEO"} trend chart`} onMouseMove={handleChartMove} onMouseLeave={() => setHoveredPoint(null)}><svg viewBox={`0 0 ${trendChartFrame.width} ${trendChartFrame.height}`} preserveAspectRatio="none"><defs><linearGradient id="websiteSeoTrendFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#16a085" stopOpacity=".25" /><stop offset="100%" stopColor="#16a085" stopOpacity=".02" /></linearGradient></defs>{[0, 1, 2, 3, 4].map((line) => { const y = trendChartFrame.plotTop + (line / 4) * (trendChartFrame.plotBottom - trendChartFrame.plotTop); return <line key={line} x1={trendChartFrame.paddingX} x2={trendChartFrame.width - trendChartFrame.paddingX} y1={y} y2={y} className="website-seo-grid-line" />; })}<path d={`${chartPath(displayChartData)} L${trendChartFrame.width - trendChartFrame.paddingX} ${trendChartFrame.plotBottom} L${trendChartFrame.paddingX} ${trendChartFrame.plotBottom} Z`} fill="url(#websiteSeoTrendFill)" /><path d={chartPath(displayChartData)} className="website-seo-chart-line" fill="none" />{displayChartData.map((point, index) => { const x = trendChartFrame.paddingX + (index / (displayChartData.length - 1)) * (trendChartFrame.width - trendChartFrame.paddingX * 2); const y = chartY(point.value, displayChartData); const showLabel = displayChartData.length <= 8 || index === 0 || index === Math.floor((displayChartData.length - 1) / 2) || index === displayChartData.length - 1; return <g key={`${point.label}-${index}`} tabIndex={0} onMouseEnter={() => setHoveredPoint({ label: point.label, value: point.value, x, y })} onFocus={() => setHoveredPoint({ label: point.label, value: point.value, x, y })} onBlur={() => setHoveredPoint(null)}><title>{`${point.label}: ${formatMetric(point.value, metricMap.get(activeMetricKey)?.format ?? "INTEGER")}`}</title><circle cx={x} cy={y} r="8" className="website-seo-chart-point-hit" /><circle cx={x} cy={y} r="4.5" className="website-seo-chart-point" />{showLabel ? <><text x={x} y={trendChartFrame.height - 10} textAnchor="middle" className="website-seo-chart-label">{point.label}</text><text x={x} y={Math.max(y - 12, 14)} textAnchor="middle" className="website-seo-chart-value">{formatMetric(point.value, metricMap.get(activeMetricKey)?.format ?? "INTEGER")}</text></> : null}</g>; })}</svg>{hoveredPoint ? <div className="website-seo-chart-tooltip" style={{ left: `${(hoveredPoint.x / trendChartFrame.width) * 100}%`, top: `${(hoveredPoint.y / trendChartFrame.height) * 100}%` }}><strong>{hoveredPoint.label}</strong><span>{activeMetric?.label ?? "SEO"}: {formatMetric(hoveredPoint.value, metricMap.get(activeMetricKey)?.format ?? "INTEGER")}</span></div> : null}</div><p className="website-seo-chart-empty">{hasReportingData ? "Hover a point to inspect its value. Publish at least two periods to show SEO movement." : "Hover anywhere on the chart to inspect the nearest value. First sync will replace the 0 baseline with reporting data."}</p></section>

          <aside className="card website-seo-insights" aria-labelledby="website-seo-insights-title"><div className="website-seo-card-heading"><h2 id="website-seo-insights-title">Key insights</h2></div><p><CheckCircle2 size={15} /> Organic sessions {insightComparison}.</p><p><CheckCircle2 size={15} /> Search impressions {dateRange.compare === "None" ? "No comparison" : comparisonAvailable ? `${renderChange(metricChange(latestRow?.impressions ?? null, comparisonRow?.impressions ?? null))} vs ${dateRange.compare === "Previous year" ? "previous year" : comparisonPeriodLabel}` : "No comparison available for the selected range"}.</p><p><CheckCircle2 size={15} /> {latestRow?.searchClicks === null || latestRow?.searchClicks === undefined ? "0 search clicks recorded." : `${latestRow.searchClicks.toLocaleString()} search clicks recorded.`} {latestRow?.ctr === null || latestRow?.ctr === undefined ? "CTR is awaiting data." : `CTR is ${formatMetric(latestRow.ctr, metricMap.get("ctr")?.format ?? "PERCENT")}.`}</p><p><CheckCircle2 size={15} /> {latestRow?.position === null || latestRow?.position === undefined ? "Average position is awaiting data." : `Average position is ${formatMetric(latestRow.position, metricMap.get("position")?.format ?? "DECIMAL")}.`} {latestRow?.topTen === null || latestRow?.topTen === undefined ? "Top-10 keyword coverage is awaiting data." : `${latestRow.topTen.toLocaleString()} keywords rank in the top 10.`}</p><div className="website-seo-insight-source">Sources: {sourceLabels || "Awaiting SEO data"}.</div></aside>
        </div>

        <div className="website-seo-lower-grid"><section className="card website-seo-results-card" aria-labelledby="website-seo-results-title"><div className="website-seo-card-heading"><div><h2 id="website-seo-results-title">Results by month</h2><p>Latest six-month reporting window</p></div><Table2 size={18} color="#148f83" /></div><div className="website-seo-table-wrap"><table className="website-seo-table"><thead><tr><th>Month</th><th>Organic sessions</th><th>Search clicks</th><th>Search impressions</th><th>CTR</th><th>Avg. position</th><th>Top-10 keywords</th></tr></thead><tbody>{tableRows.length ? tableRows.map((row, index) => <tr key={row.periodStart} className={index === tableRows.length - 1 ? "is-latest" : undefined}><td><strong>{row.periodLabel}</strong><span>{row.periodLabel === "No published data" ? "Awaiting first sync" : index === tableRows.length - 1 ? "Latest period" : "Historical period"}</span></td><td>{formatMetric(row.organicTraffic, metricMap.get("organicTraffic")?.format ?? "INTEGER")}</td><td>{formatMetric(row.searchClicks, metricMap.get("searchClicks")?.format ?? "INTEGER")}</td><td>{formatMetric(row.impressions, metricMap.get("impressions")?.format ?? "INTEGER")}</td><td>{formatMetric(row.ctr, metricMap.get("ctr")?.format ?? "PERCENT")}</td><td>{formatMetric(row.position, metricMap.get("position")?.format ?? "DECIMAL")}</td><td>{formatMetric(row.topTen, metricMap.get("topTen")?.format ?? "RANK")}</td></tr>) : <tr><td colSpan={7}>No periods match this search.</td></tr>}</tbody></table></div><div className="website-seo-table-foot"><span><TrendingUp size={13} /> CTR is calculated from clicks ÷ impressions; position is impression-weighted.</span><span>{visibleRows.length} periods · {dateRange.label}</span></div></section>

          <section className="card website-seo-visibility-card" aria-labelledby="website-seo-visibility-title"><div className="website-seo-card-heading"><div><h2 id="website-seo-visibility-title">Search Console visibility</h2><p>Actual metrics from the connected GSC property.</p></div><span className={`source-badge${metricMap.has("searchClicks") ? "" : " pending"}`}>GSC</span></div><div className="website-seo-visibility-grid">{visibilityMetrics.map((item) => <div className="website-seo-visibility-row" key={item.key}><span>{item.label}</span><strong>{formatMetric(latestRow?.[item.key] ?? null, item.format)}</strong><small>{latestRow?.periodLabel ?? "Awaiting first sync"}</small></div>)}</div><p className="website-seo-visibility-note">Search Console does not provide acquisition-channel splits. This card only shows values returned by Google for the selected property.</p></section></div>

      </>

      <PortalFeedback pagePath="/portal/website-seo" pageLabel="Website GSC" context={{ dateRange: dateRange.label, search: query || null }} />
    </div>
  </AppShell>;
}
