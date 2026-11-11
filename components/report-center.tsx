"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, BarChart3, CalendarDays, CheckCircle2, FileText, Filter, Layers3, MapPin, RefreshCw, Search } from "lucide-react";
import { AppShell } from "./app-shell";
import type { ReportStatus } from "../lib/reports/types";

export type ReportService = "Website SEO" | "GBP performance";

export type ReportListItem = {
  id: string;
  title: string;
  type: string;
  service: ReportService;
  kind: "MONTHLY" | "OTHER";
  periodLabel: string;
  status: ReportStatus;
  publishedAt: string;
  updatedAt: string;
  freshness: "PRESENTATION" | "LIVE" | "DELAYED";
};

function statusLabel(status: ReportStatus) {
  if (status === "PUBLISHED") return "Published";
  if (status === "DATA_DELAYED") return "Data delayed";
  if (status === "IN_REVIEW") return "In review";
  if (status === "SCHEDULED") return "Scheduled";
  if (status === "SENT") return "Sent";
  return "Draft";
}
function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" });
}

function formatPeriod(date: Date) {
  return date.toLocaleDateString("en-US", { timeZone: "UTC", month: "long", year: "numeric" });
}

function comparisonLabel(periodLabel: string) {
  const parsed = Date.parse("1 " + periodLabel);
  if (Number.isNaN(parsed)) return "Previous period";
  const previous = new Date(parsed);
  previous.setUTCMonth(previous.getUTCMonth() - 1);
  return formatPeriod(previous);
}

type ReportFilters = {
  kind: "ALL" | "MONTHLY";
  service: "ALL" | ReportService;
  period: "ALL" | string;
  status: "ALL" | "PUBLISHED";
  query: string;
};

const defaultFilters: ReportFilters = { kind: "MONTHLY", service: "ALL", period: "ALL", status: "PUBLISHED", query: "" };

export function ReportCenter({ clientName, brandMark, brandAccent, reports }: { clientName: string; brandMark: string; brandAccent: string; reports: ReportListItem[] }) {
  const [draftFilters, setDraftFilters] = useState<ReportFilters>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<ReportFilters>(defaultFilters);
  const periodOptions = useMemo(
    () => Array.from(new Set(reports.filter((report) => report.kind === "MONTHLY").map((report) => report.periodLabel))).sort((left, right) => Date.parse("1 " + right) - Date.parse("1 " + left)),
    [reports],
  );
  const filteredReports = useMemo(() => reports.filter((report) => {
    const query = appliedFilters.query.trim().toLowerCase();
    const matchesKind = appliedFilters.kind === "ALL" || report.kind === appliedFilters.kind;
    const matchesService = appliedFilters.service === "ALL" || report.service === appliedFilters.service;
    const matchesPeriod = appliedFilters.period === "ALL" || report.periodLabel === appliedFilters.period;
    const matchesStatus = appliedFilters.status === "ALL" || report.status === appliedFilters.status;
    const searchText = [report.title, report.type, report.service, report.periodLabel].join(" ").toLowerCase();
    return matchesKind && matchesService && matchesPeriod && matchesStatus && (!query || searchText.includes(query));
  }), [appliedFilters, reports]);
  const updateDraft = <K extends keyof ReportFilters>(key: K, value: ReportFilters[K]) => setDraftFilters((current) => ({ ...current, [key]: value }));
  const applyFilters = () => setAppliedFilters(draftFilters);
  const resetFilters = () => {
    setDraftFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
  };
  const filterSummary = [
    appliedFilters.kind === "MONTHLY" ? "Monthly reports" : "All reports",
    appliedFilters.service === "ALL" ? "All services" : appliedFilters.service,
    appliedFilters.period === "ALL" ? "All months" : appliedFilters.period,
    appliedFilters.status === "PUBLISHED" ? "Published" : "All statuses",
  ].join(" · ");

  return <AppShell mode="portal" clientName={clientName} brandMark={brandMark} brandAccent={brandAccent} activeNav="Reports">
    <div className="content report-center-page">
      <div className="report-center-intro">
        <div><p className="eyebrow">Client portal / Reports</p><h1>Client reports</h1><p>Find published performance reports by service and reporting period.</p></div>
      </div>

      <section className="card report-filter-panel" aria-labelledby="report-filter-title">
        <div className="report-filter-heading"><Filter size={17} /><h2 id="report-filter-title">Filter reports</h2></div>
        <div className="report-filter-grid">
          <label className="report-filter-field"><span>Report type</span><select value={draftFilters.kind} onChange={(event) => updateDraft("kind", event.target.value as ReportFilters["kind"])}><option value="MONTHLY">Monthly reports</option><option value="ALL">All reports</option></select></label>
          <label className="report-filter-field"><span>Service</span><select value={draftFilters.service} onChange={(event) => updateDraft("service", event.target.value as ReportFilters["service"])}><option value="ALL">All services</option><option value="Website SEO">Website SEO</option><option value="GBP performance">GBP performance</option></select></label>
          <label className="report-filter-field"><span>Reporting period</span><select value={draftFilters.period} onChange={(event) => updateDraft("period", event.target.value)}><option value="ALL">All months</option>{periodOptions.map((period) => <option key={period} value={period}>{period}</option>)}</select></label>
          <label className="report-filter-field"><span>Status</span><select value={draftFilters.status} onChange={(event) => updateDraft("status", event.target.value as ReportFilters["status"])}><option value="PUBLISHED">Published</option><option value="ALL">All statuses</option></select></label>
          <label className="report-filter-search"><span>Search reports</span><div><Search size={15} /><input value={draftFilters.query} onChange={(event) => updateDraft("query", event.target.value)} placeholder="Search reports..." aria-label="Search reports" /></div></label>
          <div className="report-filter-actions"><button className="button primary" type="button" onClick={applyFilters}>Apply filters</button><button className="report-filter-reset" type="button" onClick={resetFilters}><RefreshCw size={13} /> Reset</button></div>
        </div>
      </section>

      <div className="report-filter-summary"><strong>{filterSummary}</strong><span>{filteredReports.length} {filteredReports.length === 1 ? "report" : "reports"}</span></div>
      {filteredReports.length === 0 ? <section className="card report-empty"><div className="report-empty-mark"><FileText size={20} /></div><h2>No reports match these filters</h2><p>Try another service, reporting period, or search term.</p><button className="button" type="button" onClick={resetFilters}>Clear filters <RefreshCw size={14} /></button></section> : <div className="report-list">{filteredReports.map((report) => {
        const serviceSlug = report.service === "GBP performance" ? "gbp" : "seo";
        const statusClass = "report-status-" + report.status.toLowerCase();
        return <article className="card report-list-card" key={report.id}>
          <div className={"report-list-icon report-service-icon-" + serviceSlug}>{report.service === "GBP performance" ? <MapPin size={18} /> : <BarChart3 size={18} />}</div>
          <div className="report-list-main">
            <div className="report-list-top"><span className={"report-service-pill report-service-pill-" + serviceSlug}>{report.service}</span><div className="report-list-badges"><span className={"report-status " + statusClass}><CheckCircle2 size={12} /> {statusLabel(report.status)}</span><span className="report-coverage-pill"><Layers3 size={12} /> Source coverage included</span></div></div>
            <h3>{report.title}</h3>
            <div className="report-list-meta"><span><CalendarDays size={12} /> Period: {report.periodLabel}</span><span>Published: {formatDate(report.publishedAt)}</span><span>Comparison: {comparisonLabel(report.periodLabel)}</span></div>
          </div>
          <div className="report-list-action"><Link className="button primary" href={"/portal/reports/" + report.id}>View report <ArrowRight size={14} /></Link></div>
        </article>;
      })}</div>}
    </div>
  </AppShell>;
}
