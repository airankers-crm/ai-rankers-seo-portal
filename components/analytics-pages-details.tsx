"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, BarChart3, Eye, MousePointerClick, Target, UsersRound } from "lucide-react";
import { AppShell } from "./app-shell";
import { DateRangePicker, getDefaultDateRange, type DateRangeSelection } from "./date-range-picker";

export type AnalyticsPageRow = {
  path: string;
  periodStart: string;
  views: number;
  users: number;
  sessions: number;
  keyEvents: number;
  engagementRate: number;
};

function compact(value: number) {
  return value >= 1000 ? `${(value / 1000).toFixed(1)}K` : value.toLocaleString();
}

function dateKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

export function AnalyticsPagesDetails({ clientName, brandMark, brandAccent, rows = [] }: { clientName: string; brandMark: string; brandAccent: string; rows?: AnalyticsPageRow[] }) {
  const [dateRange, setDateRange] = useState<DateRangeSelection>(getDefaultDateRange);
  const pageRows = useMemo(() => {
    const start = dateKey(dateRange.start);
    const end = dateKey(dateRange.end);
    const grouped = new Map<string, { path: string; views: number; users: number; sessions: number; keyEvents: number; engagementRateTotal: number; periods: number }>();
    for (const row of rows) {
      const period = row.periodStart.slice(0, 10);
      if (period < start || period > end) continue;
      const current = grouped.get(row.path) ?? { path: row.path, views: 0, users: 0, sessions: 0, keyEvents: 0, engagementRateTotal: 0, periods: 0 };
      current.views += row.views;
      current.users += row.users;
      current.sessions += row.sessions;
      current.keyEvents += row.keyEvents;
      current.engagementRateTotal += row.engagementRate;
      current.periods += 1;
      grouped.set(row.path, current);
    }
    return [...grouped.values()].map((row) => ({ ...row, engagementRate: row.periods ? row.engagementRateTotal / row.periods : 0 })).sort((left, right) => right.views - left.views);
  }, [dateRange.end, dateRange.start, rows]);
  const totals = useMemo(() => pageRows.reduce((result, row) => ({ views: result.views + row.views, users: result.users + row.users, sessions: result.sessions + row.sessions, keyEvents: result.keyEvents + row.keyEvents }), { views: 0, users: 0, sessions: 0, keyEvents: 0 }), [pageRows]);
  const hasPageData = pageRows.length > 0;

  return <AppShell mode="portal" clientName={clientName} brandMark={brandMark} brandAccent={brandAccent} activeNav="Analytics">
    <div className="content analytics-pages-page" aria-label="Top page performance">
      <Link className="analytics-pages-back" href="/portal/analytics"><ArrowLeft size={15} /> Back to Analytics</Link>
      <div className="analytics-pages-heading"><div><p className="eyebrow">Website analytics</p><h1>Top pages</h1><p>See which pages bring visitors in and move them toward contact.</p></div><span className={`analytics-pages-preview${hasPageData ? " is-ready" : " is-waiting"}`}><BarChart3 size={14} /> {hasPageData ? "Page data available" : "Awaiting page data"}</span></div>

      <div className="analytics-pages-filters"><div><span className="analytics-pages-filter-label">Reporting period</span><DateRangePicker value={dateRange} onApply={setDateRange} /></div><span className="analytics-pages-filter-note">{dateRange.label}{dateRange.compare !== "None" ? ` · ${dateRange.compare}` : ""}</span></div>

      <section className="analytics-pages-summary" aria-label="Page performance summary"><article><span><Eye size={16} /> Page views</span><strong>{compact(totals.views)}</strong></article><article><span><UsersRound size={16} /> Active users</span><strong>{compact(totals.users)}</strong></article><article><span><MousePointerClick size={16} /> Sessions</span><strong>{compact(totals.sessions)}</strong></article><article><span><Target size={16} /> Key events</span><strong>{compact(totals.keyEvents)}</strong></article></section>

      <section className="card analytics-pages-table-card"><div className="analytics-pages-table-heading"><div><p className="eyebrow">Page performance</p><h2>Views by page</h2></div><span>{hasPageData ? `${pageRows.length} page${pageRows.length === 1 ? "" : "s"} in this period` : "No page rows published"}</span></div>{hasPageData ? <div className="analytics-pages-table-wrap"><table className="analytics-pages-table"><thead><tr><th>Page path</th><th>Views</th><th>Active users</th><th>Sessions</th><th>Key events</th><th>Engagement rate</th></tr></thead><tbody>{pageRows.map((row) => <tr key={row.path}><td><strong>{row.path}</strong></td><td>{row.views.toLocaleString()}</td><td>{row.users.toLocaleString()}</td><td>{row.sessions.toLocaleString()}</td><td>{row.keyEvents.toLocaleString()}</td><td>{row.engagementRate.toFixed(1)}%</td></tr>)}</tbody></table></div> : <div className="analytics-pages-empty"><BarChart3 size={22} /><div><strong>Page-level analytics are ready for connection</strong><p>Page rows will appear after the GA4 page-path report is synced and published. No sample page paths are shown as live client data.</p><Link className="button" href="/portal/feedback">Request page analytics</Link></div></div>}<p className="analytics-pages-note"><BarChart3 size={14} /> Date and comparison choices are retained; page rows will update automatically when verified GA4 page data is available.</p></section>
      <Link className="analytics-pages-back-link" href="/portal/analytics"><ArrowLeft size={14} /> Back to analytics overview <ArrowRight size={14} /></Link>
    </div>
  </AppShell>;
}
