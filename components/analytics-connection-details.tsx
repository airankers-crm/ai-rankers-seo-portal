"use client";

import Link from "next/link";
import { Activity, AlertCircle, ArrowLeft, BarChart3, Building2, CalendarDays, CheckCircle2, Clock3, Code2, Info, LockKeyhole, MessageCircle, Monitor, RefreshCw } from "lucide-react";
import { AppShell } from "./app-shell";

type ConnectionDetailsProps = {
  clientName: string;
  brandMark: string;
  brandAccent: string;
  availableMetricCount: number;
  expectedMetricCount: number;
  reportingPeriodCount: number;
  latestPeriodLabel: string | null;
  trackedEvents: string[];
};

function DetailFact({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: string }) {
  return <div className="analytics-detail-fact"><span className="analytics-detail-fact-icon"><Icon size={17} /></span><div><span>{label}</span><strong title={value}>{value}</strong></div></div>;
}

export function AnalyticsConnectionDetails({ clientName, brandMark, brandAccent, availableMetricCount, expectedMetricCount, reportingPeriodCount, latestPeriodLabel, trackedEvents }: ConnectionDetailsProps) {
  const hasReportingData = availableMetricCount > 0;
  const completeCoverage = availableMetricCount >= expectedMetricCount;
  const statusTitle = completeCoverage ? "Reporting data available" : hasReportingData ? "Partial reporting data available" : "Awaiting first GA4 sync";
  const statusDescription = completeCoverage
    ? "All expected GA4 summary fields have published values in this client workspace."
    : hasReportingData
      ? `${availableMetricCount} of ${expectedMetricCount} expected GA4 summary fields currently have published values.`
      : "The dashboard is ready, but no GA4 reporting values have been published yet.";
  const readinessRows = [
    { label: "Published GA4 metrics", status: `${availableMetricCount} of ${expectedMetricCount}`, tone: completeCoverage ? "ready" : hasReportingData ? "syncing" : "attention", icon: completeCoverage ? CheckCircle2 : hasReportingData ? RefreshCw : AlertCircle },
    { label: "Historical reporting periods", status: reportingPeriodCount > 0 ? `${reportingPeriodCount} available` : "Waiting", tone: reportingPeriodCount > 0 ? "ready" : "attention", icon: reportingPeriodCount > 0 ? CheckCircle2 : Clock3 },
    { label: "Realtime reporting", status: "Not connected", tone: "attention", icon: AlertCircle },
    { label: "Action-event reporting", status: trackedEvents.length > 0 ? `${trackedEvents.length} available` : "Setup required", tone: trackedEvents.length > 0 ? "ready" : "attention", icon: trackedEvents.length > 0 ? CheckCircle2 : AlertCircle },
  ] as const;

  return <AppShell mode="portal" clientName={clientName} brandMark={brandMark} brandAccent={brandAccent} activeNav="Analytics" shellVariant="analytics-details">
    <div className="content analytics-details-page" aria-label="Analytics connection details">
      <Link className="analytics-details-back" href="/portal/analytics"><ArrowLeft size={15} /> Back to Analytics</Link>

      <div className="page-heading analytics-details-heading"><div><p className="eyebrow">Website analytics</p><h1>Analytics connection details</h1><p>{clientName}</p></div></div>

      <section className={`analytics-connection-hero${completeCoverage ? " is-ready" : hasReportingData ? " is-partial" : " is-waiting"}`} aria-label="Analytics reporting status">
        <div className="analytics-connection-hero-copy"><span className="analytics-connection-check">{completeCoverage ? <CheckCircle2 size={26} /> : hasReportingData ? <RefreshCw size={24} /> : <Clock3 size={24} />}</span><div><strong>{statusTitle}</strong><p>{statusDescription}</p></div></div>
        <div className="analytics-connection-hero-actions"><Link className="button primary" href="/portal/feedback"><MessageCircle size={14} /> Request connection review</Link><span><LockKeyhole size={12} /> Provider credentials remain admin-only</span></div>
      </section>

      <section className="analytics-detail-facts" aria-label="Analytics reporting facts">
        <DetailFact icon={Building2} label="Workspace" value={clientName} />
        <DetailFact icon={Monitor} label="Data stream" value="Not recorded in CRM" />
        <DetailFact icon={Code2} label="Measurement ID" value="Not recorded in CRM" />
        <DetailFact icon={LockKeyhole} label="Access scope" value="Client read-only" />
        <DetailFact icon={RefreshCw} label="Latest published period" value={latestPeriodLabel ?? "Waiting for first sync"} />
        <DetailFact icon={CalendarDays} label="Reporting coverage" value={reportingPeriodCount > 0 ? `${reportingPeriodCount} period${reportingPeriodCount === 1 ? "" : "s"}` : "No periods yet"} />
      </section>

      <div className="analytics-details-grid">
        <section className="card analytics-readiness-card" aria-labelledby="analytics-readiness-title"><div className="analytics-details-card-heading"><div><p className="eyebrow">Reporting health</p><h2 id="analytics-readiness-title">Data readiness</h2></div><span className="analytics-details-info"><Info size={14} /></span></div><div className="analytics-readiness-list">{readinessRows.map(({ label, status, tone, icon: Icon }) => <div key={label}><span>{label}</span><strong className={`analytics-readiness-status ${tone}`}><Icon size={13} /> {status}</strong></div>)}</div></section>

        <section className="card analytics-events-card" aria-labelledby="analytics-events-title"><div className="analytics-details-card-heading"><div><p className="eyebrow">Published event fields</p><h2 id="analytics-events-title">Action events available</h2></div><span className="source-badge">GA4</span></div>{trackedEvents.length > 0 ? <div className="analytics-event-list">{trackedEvents.map((eventName) => <div key={eventName}><Activity size={14} /><strong>{eventName}</strong></div>)}</div> : <div className="analytics-details-empty"><Activity size={18} /><div><strong>No action events published</strong><p>Phone clicks, form submissions, and quote requests will appear after those GA4 events are configured and synced.</p></div></div>}<p className="analytics-details-note"><Info size={13} /> This screen reports only fields stored in the CRM; it does not infer provider setup.</p></section>

        <section className="card analytics-next-steps-card" aria-labelledby="analytics-next-steps-title"><div className="analytics-details-card-heading"><div><p className="eyebrow">Client guidance</p><h2 id="analytics-next-steps-title">What happens next</h2></div><BarChart3 size={18} color="#148f83" /></div><ol className="analytics-next-steps"><li><span>1</span><div><strong>Agency connects and verifies GA4</strong><p>Property identifiers and read-only credentials stay on the admin side.</p></div></li><li><span>2</span><div><strong>Verified metrics are published</strong><p>Only synced reporting values populate the client dashboard.</p></div></li><li><span>3</span><div><strong>Events unlock conversions</strong><p>Tracked calls and forms appear after their GA4 events are available.</p></div></li></ol></section>
      </div>

      <p className="analytics-details-footer"><Clock3 size={13} /> Status is based on published CRM reporting rows, not on a direct browser connection to Google.</p>
    </div>
  </AppShell>;
}
