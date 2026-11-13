"use client";

import { useMemo, useState } from "react";
import {
  Check, CheckCircle2, Clock3, Download, Eye, FileCheck2, FileText, Filter, HardDriveUpload,
  Loader2, Mail, Search, Send, ShieldCheck, UploadCloud, X,
} from "lucide-react";
import { AppShell } from "./app-shell";

type ClientOption = { id: string; businessName: string; contactEmail: string | null };
export type AdminReportRow = {
  id: string; clientId: string; clientName: string; recipientEmail: string | null; title: string; type: string; periodLabel: string;
  status: string; deliveryStatus: string; isVisible: boolean; originalFileName: string | null; sizeBytes: number | null; createdAt: string; updatedAt: string; sentAt: string | null; hasFile: boolean;
};

const reportTypes = ["Monthly SEO report", "Google Business Profile report", "Website SEO report", "Performance summary"];
const MAX_REPORT_SIZE_BYTES = 25 * 1024 * 1024;

function formatBytes(value: number | null | undefined) {
  if (!value) return "—";
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function statusLabel(status: string) {
  return status === "IN_REVIEW" ? "In review" : status === "PUBLISHED" ? "Published" : status === "SENT" ? "Sent" : status === "FAILED" ? "Failed" : "Draft";
}

function statusClass(status: string) {
  return `admin-report-status admin-report-status-${status.toLowerCase()}`;
}

function deliveryLabel(status: string) {
  return status === "SENT" ? "Sent" : status === "FAILED" ? "Failed" : "Not sent";
}

function deliveryClass(status: string) {
  return `admin-report-delivery admin-report-delivery-${status.toLowerCase()}`;
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

export function AdminReportOperations({ clients, reports: startingReports }: { clients: ClientOption[]; reports: AdminReportRow[] }) {
  const [reports, setReports] = useState(startingReports);
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [type, setType] = useState(reportTypes[0]);
  const [periodLabel, setPeriodLabel] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [intent, setIntent] = useState<"DRAFT" | "IN_REVIEW">("DRAFT");
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [confirmationReport, setConfirmationReport] = useState<AdminReportRow | null>(null);

  const selectedClient = clients.find((client) => client.id === clientId);
  const visibleReports = useMemo(() => reports.filter((report) => {
    const search = `${report.title} ${report.clientName} ${report.periodLabel} ${report.originalFileName ?? ""}`.toLowerCase();
    return (statusFilter === "ALL" || report.status === statusFilter || report.deliveryStatus === statusFilter) && (!query.trim() || search.includes(query.trim().toLowerCase()));
  }), [query, reports, statusFilter]);
  const counts = { published: reports.filter((report) => report.status === "PUBLISHED").length, sent: reports.filter((report) => report.deliveryStatus === "SENT").length, review: reports.filter((report) => report.status === "IN_REVIEW").length };

  function validateFile(nextFile: File | null) {
    setError(null);
    if (!nextFile) return;
    if (!nextFile.name.toLowerCase().endsWith(".pdf") || (nextFile.type && nextFile.type !== "application/pdf")) return setError("Only PDF files are supported.");
    if (nextFile.size > MAX_REPORT_SIZE_BYTES) return setError("PDF files must be 25 MB or smaller.");
    setFile(nextFile);
  }

  async function submitUpload(nextIntent: "DRAFT" | "IN_REVIEW") {
    if (busy) return;
    setIntent(nextIntent);
    setError(null);
    if (!clientId || !title.trim() || !periodLabel.trim() || !file) return setError("Choose a client, add a title and period, and attach a PDF.");
    setBusy(true);
    setProgress(18);
    setProgressLabel("Checking PDF type and size");
    const form = new FormData();
    form.set("clientId", clientId); form.set("title", title.trim()); form.set("type", type); form.set("periodLabel", periodLabel.trim()); form.set("intent", nextIntent); form.set("file", file);
    try {
      setProgress(52); setProgressLabel("Uploading and checking file signature");
      const response = await fetch("/api/admin/reports", { method: "POST", body: form });
      const body = await response.json().catch(() => null) as { report?: AdminReportRow; error?: string } | null;
      if (!response.ok || !body?.report) throw new Error(body?.error || "The report could not be uploaded.");
      setProgress(100); setProgressLabel("Security checks passed");
      setReports((current) => [body.report!, ...current]);
      setTitle(""); setPeriodLabel(""); setFile(null);
      if (nextIntent === "IN_REVIEW") setConfirmationReport(body.report);
      else { setNotice("Draft saved securely"); window.setTimeout(() => setNotice(null), 2600); }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "The report could not be uploaded.");
      setProgress(0); setProgressLabel("");
    } finally {
      setBusy(false);
    }
  }

  async function sendReport(report: AdminReportRow) {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      const response = await fetch(`/api/admin/reports/${encodeURIComponent(report.id)}/send`, { method: "POST" });
      const body = await response.json().catch(() => null) as { report?: { status: string; deliveryStatus: string; isVisible: boolean; sentAt: string | null }; error?: string } | null;
      if (!response.ok || !body?.report) throw new Error(body?.error || "The report could not be sent.");
      setReports((current) => current.map((item) => item.id === report.id ? { ...item, status: body.report!.status, deliveryStatus: body.report!.deliveryStatus, isVisible: body.report!.isVisible, sentAt: body.report!.sentAt } : item));
      setConfirmationReport(null); setNotice("Report sent to the client portal"); window.setTimeout(() => setNotice(null), 2800);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "The report could not be sent.");
      setConfirmationReport(null);
    } finally { setBusy(false); }
  }

  function openConfirmation(report: AdminReportRow) { setError(null); setConfirmationReport(report); }

  return <AppShell mode="admin" clientName="AI Rankers" brandMark="AR" brandAccent="#f26b38" activeNav="Reports">
    <div className="content admin-report-page">
      <div className="admin-report-heading"><div><p className="eyebrow">Reporting & content / Reports</p><h1>Report operations</h1><p>Upload, review, and deliver a client-ready PDF from one controlled workflow.</p></div><div className="admin-report-heading-note"><ShieldCheck size={17} /><span>Private client delivery</span></div></div>

      {error ? <div className="admin-report-alert error" role="alert"><X size={15} /> {error}<button type="button" onClick={() => setError(null)} aria-label="Dismiss error"><X size={14} /></button></div> : null}
      {notice ? <div className="admin-report-alert success" role="status"><Check size={15} /> {notice}</div> : null}

      <div className="admin-report-summary-grid" aria-label="Report workspace summary">
        <div className="admin-report-summary-card"><span className="admin-report-summary-icon purple"><FileText size={17} /></span><div><strong>{reports.length}</strong><span>Total reports</span></div></div>
        <div className="admin-report-summary-card"><span className="admin-report-summary-icon teal"><CheckCircle2 size={17} /></span><div><strong>{counts.sent + counts.published}</strong><span>Client-visible</span></div></div>
        <div className="admin-report-summary-card"><span className="admin-report-summary-icon orange"><Clock3 size={17} /></span><div><strong>{counts.review}</strong><span>Awaiting review</span></div></div>
      </div>

      <section className="admin-report-upload-card card" aria-labelledby="upload-report-title">
        <div className="admin-report-card-heading"><div><p className="eyebrow">One upload entry point</p><h2 id="upload-report-title">Upload a client report</h2><p>Attach a PDF, choose its recipient, and save it for review or delivery.</p></div><span className="admin-report-step-count">1 upload · 1 recipient</span></div>
        <div className="admin-report-stepper" aria-label="Report workflow"><span className="active"><b>1</b> Upload PDF</span><i /><span><b>2</b> Review</span><i /><span><b>3</b> Send to client</span></div>
        <div className="admin-report-upload-grid">
          <form className="admin-report-form" onSubmit={(event) => { event.preventDefault(); void submitUpload("DRAFT"); }}>
            <div className="admin-report-fields">
              <label>Client recipient<select value={clientId} onChange={(event) => setClientId(event.target.value)}><option value="">Select a client</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.businessName}</option>)}</select></label>
              <label>Report title<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Monthly SEO report — November 2026" maxLength={120} /></label>
              <label>Report type<select value={type} onChange={(event) => setType(event.target.value)}>{reportTypes.map((option) => <option key={option}>{option}</option>)}</select></label>
              <label>Reporting period<input value={periodLabel} onChange={(event) => setPeriodLabel(event.target.value)} placeholder="November 2026" maxLength={60} /></label>
            </div>
            <div className={`admin-report-dropzone${dragging ? " dragging" : ""}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); validateFile(event.dataTransfer.files[0] ?? null); }}>
              <input id="report-pdf" type="file" accept="application/pdf,.pdf" onChange={(event) => validateFile(event.target.files?.[0] ?? null)} />
              <label htmlFor="report-pdf"><span className="admin-report-upload-icon"><UploadCloud size={21} /></span><strong>{file ? file.name : "Drop your PDF here or browse"}</strong><small>{file ? `${formatBytes(file.size)} · PDF selected` : "PDF only · maximum 25 MB"}</small></label>
            </div>
            {file ? <div className="admin-report-file-row"><FileCheck2 size={16} /><div><strong>PDF signature validated</strong><span>{formatBytes(file.size)} · Ready for secure upload</span></div><button type="button" onClick={() => setFile(null)} aria-label="Remove selected PDF"><X size={15} /></button></div> : null}
            {busy || progress > 0 ? <div className="admin-report-progress-wrap"><div><span>{progressLabel || "Preparing upload"}</span><strong>{progress}%</strong></div><div className="admin-report-progress"><span style={{ width: `${progress}%` }} /></div><small><ShieldCheck size={12} /> Server validates file signature and size before storage</small></div> : null}
            <div className="admin-report-form-actions"><span><ShieldCheck size={13} /> Client visibility stays off until you confirm send.</span><div><button className="button" type="submit" disabled={busy}><HardDriveUpload size={14} /> {busy && intent === "DRAFT" ? "Saving…" : "Save draft"}</button><button className="button primary" type="button" disabled={busy} onClick={() => void submitUpload("IN_REVIEW")}><Send size={14} /> {busy && intent === "IN_REVIEW" ? "Uploading…" : "Review & send"}</button></div></div>
          </form>
          <aside className="admin-report-delivery-card"><div className="admin-report-delivery-heading"><div><p className="eyebrow">Client delivery</p><h3>Ready to send?</h3></div><Mail size={17} /></div><div className="admin-report-recipient"><span>Recipient</span><strong>{selectedClient?.businessName || "Select a client"}</strong><small>{selectedClient?.contactEmail || "Client email will appear here"}</small></div><ul className="admin-report-checklist"><li className={selectedClient ? "complete" : "pending"}><CheckCircle2 size={15} /><span>Correct client selected</span></li><li className={title.trim() ? "complete" : "pending"}><CheckCircle2 size={15} /><span>Report title added</span></li><li className={periodLabel.trim() ? "complete" : "pending"}><CheckCircle2 size={15} /><span>Reporting period added</span></li><li className={file ? "complete" : "pending"}><CheckCircle2 size={15} /><span>PDF validated and ready</span></li><li className="pending"><CheckCircle2 size={15} /><span>Confirmation required before send</span></li></ul><p className="admin-report-delivery-note"><ShieldCheck size={13} /> Sending publishes this PDF in the selected client portal. It does not send email until an email provider is connected.</p></aside>
        </div>
      </section>

      <section className="admin-report-library card" aria-labelledby="recent-reports-title">
        <div className="admin-report-library-heading"><div><p className="eyebrow">Report library</p><h2 id="recent-reports-title">Recent reports</h2><p>Keep draft, review, delivery, and failure states visible to the operator.</p></div><span className="admin-report-library-count">{visibleReports.length} shown</span></div>
        <div className="admin-report-library-toolbar"><label className="admin-report-search"><Search size={14} /><span className="sr-only">Search reports</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search reports or clients" /></label><label className="admin-report-filter"><Filter size={14} /><span className="sr-only">Filter status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="ALL">All statuses</option><option value="DRAFT">Draft</option><option value="IN_REVIEW">In review</option><option value="PUBLISHED">Published</option><option value="SENT">Sent</option><option value="FAILED">Failed</option></select></label></div>
        {visibleReports.length === 0 ? <div className="admin-report-empty"><span><FileText size={19} /></span><h3>{reports.length ? "No reports match these filters" : "No reports yet"}</h3><p>{reports.length ? "Try another status or search term." : "Upload the first client report above. It will stay private until you confirm delivery."}</p></div> : <div className="admin-report-table-wrap"><table className="admin-report-table"><thead><tr><th>Report</th><th>Client</th><th>Report status</th><th>Delivery</th><th>Updated</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{visibleReports.map((report) => <tr key={report.id}><td><div className="admin-report-table-title"><span><FileText size={15} /></span><div><strong>{report.title}</strong><small>{report.originalFileName || report.type} · {report.periodLabel} {report.sizeBytes ? `· ${formatBytes(report.sizeBytes)}` : ""}</small></div></div></td><td><strong>{report.clientName}</strong><small className="admin-report-recipient-email">{report.recipientEmail || "No email on file"}</small></td><td><span className={statusClass(report.status)}>{statusLabel(report.status)}</span></td><td><span className={deliveryClass(report.deliveryStatus)}>{deliveryLabel(report.deliveryStatus)}</span>{report.isVisible ? <small className="admin-report-visible"><Eye size={11} /> Client visible</small> : null}</td><td>{dateLabel(report.updatedAt)}</td><td><div className="admin-report-row-actions">{report.hasFile ? <><a href={`/api/reports/${encodeURIComponent(report.id)}/file`} target="_blank" rel="noreferrer" title="Open PDF"><Eye size={14} /></a><a href={`/api/reports/${encodeURIComponent(report.id)}/file?download=1`} title="Download PDF"><Download size={14} /></a></> : null}{report.deliveryStatus !== "SENT" && report.deliveryStatus !== "FAILED" && report.hasFile ? <button type="button" className="admin-report-send-link" onClick={() => openConfirmation(report)}><Send size={13} /> Review & send</button> : null}</div></td></tr>)}</tbody></table></div>}
      </section>
    </div>
    {confirmationReport ? <div className="admin-report-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) setConfirmationReport(null); }}><section className="admin-report-confirmation" role="dialog" aria-modal="true" aria-labelledby="confirm-report-title"><div className="admin-report-confirmation-head"><div><span className="admin-report-confirmation-icon"><Send size={18} /></span><p className="eyebrow">Final confirmation</p><h2 id="confirm-report-title">Send this report?</h2></div><button type="button" className="icon-button" onClick={() => setConfirmationReport(null)} aria-label="Close confirmation" disabled={busy}><X size={16} /></button></div><p className="admin-report-confirmation-copy">This will make the PDF available in the client portal. Check the recipient carefully before continuing.</p><div className="admin-report-confirmation-recipient"><span>Sending to</span><strong>{confirmationReport.clientName}</strong><small>{confirmationReport.recipientEmail || "No client email is configured"}</small></div><div className="admin-report-confirmation-report"><FileText size={17} /><div><strong>{confirmationReport.title}</strong><span>{confirmationReport.periodLabel} · {confirmationReport.originalFileName || "PDF report"}</span></div></div><div className="admin-report-confirmation-actions"><button type="button" className="button" onClick={() => setConfirmationReport(null)} disabled={busy}>Keep as draft</button><button type="button" className="button primary" onClick={() => void sendReport(confirmationReport)} disabled={busy}>{busy ? <Loader2 className="spin" size={14} /> : <Send size={14} />} {busy ? "Sending…" : "Confirm & send"}</button></div></section></div> : null}
  </AppShell>;
}
