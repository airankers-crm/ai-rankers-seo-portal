import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, CheckCircle2, FileText, LockKeyhole, Sparkles } from "lucide-react";
import { AppShell } from "./app-shell";
import type { ReportStatus } from "../lib/reports/types";

export type ReportListItem = {
  id: string;
  title: string;
  type: string;
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

export function ReportCenter({ clientName, brandMark, brandAccent, reports }: { clientName: string; brandMark: string; brandAccent: string; reports: ReportListItem[] }) {
  return <AppShell mode="portal" clientName={clientName} brandMark={brandMark} brandAccent={brandAccent} activeNav="Reports">
    <div className="content report-center-page">
      <div className="report-center-intro">
        <div><p className="eyebrow">Client portal / Report Center</p><h1>Reports</h1><p>Published client reports, reporting periods, source coverage, and delivery records.</p></div>
        <div className="report-brand-lockup"><Image src="/branding/ai-rankers/brand_logo.png" alt="The AI Rankers" width={215} height={42} priority /><span>Prepared for {clientName}</span></div>
      </div>

      <section className="card report-center-banner"><div className="report-center-banner-icon"><Sparkles size={18} /></div><div><p className="eyebrow">Report coverage</p><h2>Website SEO and local performance</h2><p>Reports contain approved metrics, completed work, source status, and metric definitions for the selected period.</p></div><div className="report-center-banner-meta"><span>Client view</span><strong>{reports.length} published {reports.length === 1 ? "report" : "reports"}</strong></div></section>

      <div className="report-list-heading"><div><p className="eyebrow">Report library</p><h2>Published reports</h2><p>Approved SEO performance reports from The AI Rankers team.</p></div><span className="report-lock-note"><LockKeyhole size={13} /> Client view</span></div>
      {reports.length === 0 ? <section className="card report-empty"><div className="report-empty-mark"><FileText size={20} /></div><h2>No published reports</h2><p>Published reports will appear after the reporting review is complete.</p><span className="report-freshness-note">No report data is available.</span></section> : <div className="report-list">{reports.map((report) => <article className="card report-list-card" key={report.id}><div className="report-list-icon"><FileText size={18} /></div><div className="report-list-main"><div className="report-list-top"><span className="report-type">{report.type}</span><span className={`report-status report-status-${report.status.toLowerCase()}`}><CheckCircle2 size={12} /> {statusLabel(report.status)}</span></div><h3>{report.title}</h3><div className="report-list-meta"><span><CalendarDays size={12} /> {report.periodLabel}</span><span>Published {formatDate(report.publishedAt)}</span><span>Updated {formatDate(report.updatedAt)}</span></div><div className="report-freshness"><span className={`freshness-indicator ${report.freshness.toLowerCase()}`} /><span>{report.freshness === "PRESENTATION" ? "Presentation dataset · source context included" : report.freshness === "DELAYED" ? "Data delayed · review methodology" : "Live source data"}</span></div></div><div className="report-list-action"><Link className="button primary" href={`/portal/reports/${report.id}`}>View report <ArrowRight size={14} /></Link><span>PDF-ready print view</span></div></article>)}</div>}

      <footer className="report-center-footer"><Image className="report-center-footer-logo" src="/branding/ai-rankers/brand_logo.png" alt="The AI Rankers" width={116} height={37} /><span>Client reporting workspace</span></footer>
    </div>
  </AppShell>;
}
