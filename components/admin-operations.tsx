"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, CheckCircle2, ChevronDown, CircleAlert, Database, Filter, Loader2, Search, Send, ShieldCheck, X } from "lucide-react";
import { AppShell } from "./app-shell";

export type AdminOperationRow = Record<string, string>;

export type AdminOperationReply = {
  id: string;
  message: string;
  createdAt: string;
  authorName: string;
};

export type AdminOperationDetail = {
  eyebrow?: string;
  title: string;
  status?: { label: string; tone: "complete" | "progress" | "urgent" | "neutral" };
  message: string;
  metadata?: Array<{ label: string; value: string; detail?: string }>;
  context?: string | null;
  reply?: { endpoint: string; initialReplies: AdminOperationReply[] };
};

export type AdminOperationConfig = {
  activeNav: string;
  title: string;
  description: string;
  sourceLabel: string;
  sourceDescription: string;
  columns: Array<{ key: string; label: string }>;
  rows?: AdminOperationRow[];
  filters?: Array<{ key: string; label: string; options: string[] }>;
  emptyTitle: string;
  emptyDescription: string;
  primaryAction?: { label: string; href: string };
  secondaryAction?: { label: string; href: string };
  rowAction?: { label: string; hrefPrefix: string; hrefSuffix?: string; drawer?: boolean; menu?: Array<{ label: string; hrefSuffix: string }> };
  detailPanel?: Record<string, AdminOperationDetail>;
  showContext?: boolean;
};

function formatDrawerDate(value: string) {
  return new Date(value).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function AdminOperationDrawer({ detail, onClose }: { detail: AdminOperationDetail; onClose: () => void }) {
  const [replies, setReplies] = useState(detail.reply?.initialReplies ?? []);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  async function submitReply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || !detail.reply || pending) return;
    setPending(true);
    setNotice("");
    setError("");
    try {
      const response = await fetch(detail.reply.endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: trimmed }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Unable to send this response.");
      setReplies((current) => [...current, { ...body.reply, authorName: "You" }]);
      setMessage("");
      setNotice("Response sent");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to send this response.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button className="admin-operation-drawer-backdrop" type="button" aria-label="Close feedback details" onClick={onClose} />
      <aside className="admin-operation-drawer" role="dialog" aria-modal="true" aria-labelledby="admin-operation-drawer-title">
        <header className="admin-operation-drawer-header">
          <div>
            {detail.eyebrow ? <span>{detail.eyebrow}</span> : null}
            <h2 id="admin-operation-drawer-title">{detail.title}</h2>
          </div>
          <button className="admin-operation-drawer-close" type="button" aria-label="Close feedback details" onClick={onClose}><X size={18} /></button>
        </header>
        <div className="admin-operation-drawer-body">
          {detail.status ? <div className={`status ${detail.status.tone}`}><CheckCircle2 size={13} /> {detail.status.label}</div> : null}
          <section className="admin-operation-drawer-message">
            <div className="admin-operation-drawer-section-heading"><CircleAlert size={16} /><div><strong>Feedback message</strong><small>Submitted by the client portal</small></div></div>
            <p>{detail.message}</p>
          </section>
          {detail.metadata?.length ? <dl className="admin-operation-drawer-meta">{detail.metadata.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}{item.detail ? <small>{item.detail}</small> : null}</dd></div>)}</dl> : null}
          {detail.context ? <details className="admin-operation-drawer-context"><summary>View captured page context</summary><pre>{detail.context}</pre></details> : null}
          {detail.reply ? <section className="admin-operation-drawer-reply">
            <div className="admin-operation-drawer-section-heading"><Send size={16} /><div><strong>Response thread</strong><small>Reply directly from the feedback inbox</small></div></div>
            {replies.length ? <div className="admin-operation-drawer-thread">{replies.map((reply) => <article key={reply.id}><div><strong>{reply.authorName}</strong><time dateTime={reply.createdAt}>{formatDrawerDate(reply.createdAt)}</time></div><p>{reply.message}</p></article>)}</div> : <p className="admin-operation-drawer-empty">No response has been sent yet.</p>}
            <form className="admin-operation-drawer-form" onSubmit={submitReply}>
              <label htmlFor="admin-feedback-reply">Write a response</label>
              <textarea id="admin-feedback-reply" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Add a clear response for the client…" rows={4} disabled={pending} />
              <div><small>{notice ? <span className="admin-operation-drawer-success">{notice}</span> : "Your response will be visible in the client portal."}</small><button className="button primary" type="submit" disabled={pending || !message.trim()}>{pending ? <><Loader2 size={14} className="spin" /> Sending…</> : <><Send size={14} /> Send response</>}</button></div>
              {error ? <p className="admin-operation-drawer-error">{error}</p> : null}
            </form>
          </section> : null}
        </div>
      </aside>
    </>
  );
}

export function AdminOperationsPage({ config }: { config: AdminOperationConfig }) {
  const [query, setQuery] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string>>({});
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const rows = useMemo(() => config.rows ?? [], [config.rows]);
  const filteredRows = useMemo(() => rows.filter((row) => {
    const searchable = Object.values(row).join(" ").toLowerCase();
    const matchesQuery = searchable.includes(query.toLowerCase());
    const matchesFilters = Object.entries(selectedFilters).every(([key, value]) => !value || value === "All" || row[key] === value);
    return matchesQuery && matchesFilters;
  }), [query, rows, selectedFilters]);

  return (
    <AppShell mode="admin" activeNav={config.activeNav}>
      <div className="content">
        <div className="page-heading">
          <div>
            <h1>{config.title}</h1>
            {config.description ? <p>{config.description}</p> : null}
          </div>
          {config.primaryAction || config.secondaryAction ? <div className="heading-actions">{config.secondaryAction ? <a className="button" href={config.secondaryAction.href}>{config.secondaryAction.label}</a> : null}{config.primaryAction ? <a className="button primary" href={config.primaryAction.href}>{config.primaryAction.label} <ArrowUpRight size={14} /></a> : null}</div> : null}
        </div>

        {config.showContext !== false ? <section className="ops-context card">
          <div className="ops-context-icon"><Database size={17} /></div>
          <div><strong>{config.sourceLabel}</strong><p>{config.sourceDescription}</p></div>
          <span className="status progress">Readiness tracked</span>
        </section> : null}

        <section className="card ops-workspace" aria-label={`${config.title} workspace`}>
          <div className="ops-toolbar">
            <div><h2>{config.title}</h2><p>{rows.length ? `${filteredRows.length} of ${rows.length} records` : "No live records in this workspace yet"}</p></div>
            <div className="ops-toolbar-badge"><ShieldCheck size={14} /> Tenant-scoped workspace</div>
          </div>
          <div className="ops-filters">
            <label className="ops-search"><Search size={15} /><span className="sr-only">Search {config.title}</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${config.title.toLowerCase()}`} /></label>
            {config.filters?.map((filter) => <label className="ops-filter" key={filter.key}><Filter size={13} /><span className="sr-only">{filter.label}</span><select value={selectedFilters[filter.key] ?? "All"} onChange={(event) => setSelectedFilters((current) => ({ ...current, [filter.key]: event.target.value }))}><option value="All">{filter.label}: All</option>{filter.options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>)}
          </div>

              {filteredRows.length ? <div className="table-scroll ops-table-scroll"><table className="client-table ops-table"><thead><tr>{config.columns.map((column) => <th key={column.key}>{column.label}</th>)}<th>Action</th></tr></thead><tbody>{filteredRows.map((row, index) => <tr key={`${row.id ?? row.name ?? "row"}-${index}`}>{config.columns.map((column) => <td key={column.key}>{row[column.key] ?? "—"}</td>)}<td>{config.rowAction && row.id ? config.rowAction.menu ? <details className="table-action-menu"><summary className="table-action table-action-menu-trigger">{config.rowAction.label}<ChevronDown size={13} /></summary><div className="table-action-menu-list">{config.rowAction.menu.map((item) => <a href={`${config.rowAction?.hrefPrefix}${encodeURIComponent(row.id as string)}${item.hrefSuffix}`} key={item.label}>{item.label}<ArrowUpRight size={12} /></a>)}</div></details> : config.rowAction.drawer && config.detailPanel?.[row.id] ? <button className="table-action" type="button" onClick={() => setDrawerId(row.id as string)}>{config.rowAction.label} <ArrowUpRight size={12} style={{ verticalAlign: "-2px" }} /></button> : <a className="table-action" href={`${config.rowAction.hrefPrefix}${encodeURIComponent(row.id)}${config.rowAction.hrefSuffix ?? ""}`}>{config.rowAction.label} <ArrowUpRight size={12} style={{ verticalAlign: "-2px" }} /></a> : <span className="table-muted">Recorded</span>}</td></tr>)}</tbody></table></div> : <div className="ops-empty"><div className="ops-empty-mark"><Database size={19} /></div><div><h3>{query || Object.values(selectedFilters).some(Boolean) ? "No records match these filters" : config.emptyTitle}</h3><p>{query || Object.values(selectedFilters).some(Boolean) ? "Clear the search or filters to review the full workspace." : config.emptyDescription}</p></div></div>}
        </section>

        {drawerId && config.detailPanel?.[drawerId] ? <AdminOperationDrawer detail={config.detailPanel[drawerId]} onClose={() => setDrawerId(null)} /> : null}

      </div>
    </AppShell>
  );
}
