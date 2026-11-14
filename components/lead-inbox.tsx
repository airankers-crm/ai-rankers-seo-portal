"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Database, Filter, Inbox, Mail, Phone, Search, ShieldCheck, UserRound, X } from "lucide-react";
import { AppShell } from "./app-shell";

export type LeadInboxRecord = {
  id: string;
  clientName?: string;
  name: string;
  phone: string | null;
  email: string | null;
  service: string | null;
  message: string | null;
  source: string;
  status: "NEW" | "CONTACTED" | "QUALIFIED" | "WON" | "LOST";
  submittedAt: string;
};

function statusLabel(status: LeadInboxRecord["status"]) {
  return status === "CONTACTED" ? "Contacted" : status === "QUALIFIED" ? "Qualified" : status === "WON" ? "Won" : status === "LOST" ? "Lost" : "New";
}

function statusClass(status: LeadInboxRecord["status"]) {
  return status === "WON" ? "complete" : status === "LOST" ? "neutral" : status === "NEW" ? "planned" : "progress";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export function LeadInbox({ mode, businessName, brandMark, brandAccent, leads }: { mode: "admin" | "portal"; businessName?: string; brandMark?: string | null; brandAccent?: string; leads: LeadInboxRecord[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [selectedLead, setSelectedLead] = useState<LeadInboxRecord | null>(null);
  const filteredLeads = useMemo(() => leads.filter((lead) => {
    const search = [lead.name, lead.email, lead.phone, lead.service, lead.clientName, lead.message].filter(Boolean).join(" ").toLowerCase();
    return (status === "ALL" || lead.status === status) && search.includes(query.trim().toLowerCase());
  }), [leads, query, status]);
  const activeCount = leads.filter((lead) => !["WON", "LOST"].includes(lead.status)).length;

  return (
    <AppShell mode={mode} activeNav="Leads" clientName={businessName} brandMark={brandMark ?? undefined} brandAccent={brandAccent}>
      <div className="content">
        <div className="page-heading">
          <div>
            <p className="eyebrow">{mode === "admin" ? "CRM workspace / First-party demand" : "Client workspace / First-party demand"}</p>
            <h1>{mode === "admin" ? "Lead inbox" : "Website leads"}</h1>
            <p>{mode === "admin" ? "Review inquiries received from connected WordPress forms and keep source context attached to every record." : "Review inquiries submitted through your website. Only leads belonging to this client workspace are shown."}</p>
          </div>
          <div className="heading-actions"><span className="status complete"><span className="dot" /> {activeCount} active</span></div>
        </div>

        <section className="ops-context card">
          <div className="ops-context-icon"><Inbox size={17} /></div>
          <div><strong>{mode === "admin" ? "MetForm → CRM lead boundary" : "Website form lead records"}</strong><p>{mode === "admin" ? "Live records created by the secured WordPress MetForm webhook. Source and submission time remain visible for review." : "Leads are received from the website form and stored in the client workspace for follow-up."}</p></div>
          <span className="status complete">{leads.length} {leads.length === 1 ? "record" : "records"}</span>
        </section>

        <section className="card ops-workspace" aria-label={`${mode === "admin" ? "Lead inbox" : "Website leads"} workspace`}>
          <div className="ops-toolbar">
            <div><h2>{mode === "admin" ? "All connected leads" : "Your website inquiries"}</h2><p>{leads.length ? `${filteredLeads.length} of ${leads.length} records` : "No website leads have arrived yet"}</p></div>
            <div className="ops-toolbar-badge"><ShieldCheck size={14} /> {mode === "admin" ? "Tenant-scoped workspace" : "Private client workspace"}</div>
          </div>
          <div className="ops-filters">
            <label className="ops-search"><Search size={15} /><span className="sr-only">Search leads</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email, phone, or service" /></label>
            <label className="ops-filter"><Filter size={13} /><span className="sr-only">Filter by lead status</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="ALL">Status: All</option><option value="NEW">New</option><option value="CONTACTED">Contacted</option><option value="QUALIFIED">Qualified</option><option value="WON">Won</option><option value="LOST">Lost</option></select></label>
          </div>

          {filteredLeads.length ? <div className="table-scroll ops-table-scroll"><table className="client-table ops-table"><thead><tr>{mode === "admin" ? <th>Client</th> : null}<th>Contact</th><th>Request</th><th>Source</th><th>Status</th><th>Received</th><th><span className="sr-only">Details</span></th></tr></thead><tbody>{filteredLeads.map((lead) => <tr key={lead.id}>
            {mode === "admin" ? <td>{lead.clientName ?? "—"}</td> : null}
            <td><div className="client-name"><span className="client-logo"><UserRound size={14} /></span><span><strong>{lead.name}</strong><small>{lead.email ?? lead.phone ?? "No contact detail"}</small></span></div></td>
            <td>{lead.service ?? "General inquiry"}</td>
            <td>{lead.source === "wordpress-metform" ? "WordPress / MetForm" : lead.source}</td>
            <td><span className={`status ${statusClass(lead.status)}`}>{statusLabel(lead.status)}</span></td>
            <td>{formatDate(lead.submittedAt)}</td>
            <td><button className="table-action" type="button" onClick={() => setSelectedLead(lead)}>View details</button></td>
          </tr>)}</tbody></table></div> : <div className="ops-empty"><div className="ops-empty-mark"><Database size={19} /></div><div><h3>{query || status !== "ALL" ? "No leads match these filters" : "No website leads yet"}</h3><p>{query || status !== "ALL" ? "Clear the search or status filter to review the full lead inbox." : mode === "admin" ? "Configure the WordPress MetForm webhook and send a synthetic test submission to create the first record." : "When someone submits the website contact form, the inquiry will appear here."}</p></div></div>}
        </section>

        <section className="ops-callout"><ShieldCheck size={16} /><div><strong>Client visibility is scoped by the authenticated workspace.</strong><p>Contact details are shown only to the agency team and the client workspace that owns the lead. The webhook itself accepts submissions only with the configured secret.</p></div></section>
      </div>

      {selectedLead ? <div className="modal-backdrop" role="presentation" onClick={() => setSelectedLead(null)}><section className="report-modal activity-modal" role="dialog" aria-modal="true" aria-labelledby="lead-detail-title" onClick={(event) => event.stopPropagation()}>
        <div className="modal-heading"><div><p className="eyebrow">Lead detail</p><h2 id="lead-detail-title">{selectedLead.name}</h2><p>{selectedLead.service ?? "General inquiry"} · {formatDate(selectedLead.submittedAt)}</p></div><button className="icon-button" type="button" aria-label="Close lead details" onClick={() => setSelectedLead(null)}><X size={16} /></button></div>
        <div className="report-preview-grid"><div><span><Mail size={12} /> Email</span><strong>{selectedLead.email ?? "Not provided"}</strong></div><div><span><Phone size={12} /> Phone</span><strong>{selectedLead.phone ?? "Not provided"}</strong></div><div><span><CalendarDays size={12} /> Status</span><strong>{statusLabel(selectedLead.status)}</strong></div></div>
        <div className="report-preview-note"><Inbox size={16} /><div><strong>Message</strong><p>{selectedLead.message ?? "No message was included with this inquiry."}</p></div></div>
        <div className="modal-actions"><button className="button" type="button" onClick={() => setSelectedLead(null)}>Close</button></div>
      </section></div> : null}
    </AppShell>
  );
}
