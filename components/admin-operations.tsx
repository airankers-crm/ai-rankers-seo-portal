"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, Database, Filter, Search, ShieldCheck } from "lucide-react";
import { AppShell } from "./app-shell";

export type AdminOperationRow = Record<string, string>;

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
};

export function AdminOperationsPage({ config }: { config: AdminOperationConfig }) {
  const [query, setQuery] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string>>({});
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
            <p className="eyebrow">The AI Rankers / Operations</p>
            <h1>{config.title}</h1>
            <p>{config.description}</p>
          </div>
          {config.primaryAction ? <div className="heading-actions"><a className="button primary" href={config.primaryAction.href}>{config.primaryAction.label} <ArrowUpRight size={14} /></a></div> : null}
        </div>

        <section className="ops-context card">
          <div className="ops-context-icon"><Database size={17} /></div>
          <div><strong>{config.sourceLabel}</strong><p>{config.sourceDescription}</p></div>
          <span className="status progress">Readiness tracked</span>
        </section>

        <section className="card ops-workspace" aria-label={`${config.title} workspace`}>
          <div className="ops-toolbar">
            <div><h2>{config.title}</h2><p>{rows.length ? `${filteredRows.length} of ${rows.length} records` : "No live records in this workspace yet"}</p></div>
            <div className="ops-toolbar-badge"><ShieldCheck size={14} /> Tenant-scoped workspace</div>
          </div>
          <div className="ops-filters">
            <label className="ops-search"><Search size={15} /><span className="sr-only">Search {config.title}</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${config.title.toLowerCase()}`} /></label>
            {config.filters?.map((filter) => <label className="ops-filter" key={filter.key}><Filter size={13} /><span className="sr-only">{filter.label}</span><select value={selectedFilters[filter.key] ?? "All"} onChange={(event) => setSelectedFilters((current) => ({ ...current, [filter.key]: event.target.value }))}><option value="All">{filter.label}: All</option>{filter.options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>)}
          </div>

          {filteredRows.length ? <div className="table-scroll ops-table-scroll"><table className="client-table ops-table"><thead><tr>{config.columns.map((column) => <th key={column.key}>{column.label}</th>)}<th>Action</th></tr></thead><tbody>{filteredRows.map((row, index) => <tr key={`${row.id ?? row.name ?? "row"}-${index}`}>{config.columns.map((column) => <td key={column.key}>{row[column.key] ?? "—"}</td>)}<td><button className="table-action" type="button">View details <ArrowUpRight size={12} style={{ verticalAlign: "-2px" }} /></button></td></tr>)}</tbody></table></div> : <div className="ops-empty"><div className="ops-empty-mark"><Database size={19} /></div><div><h3>{query || Object.values(selectedFilters).some(Boolean) ? "No records match these filters" : config.emptyTitle}</h3><p>{query || Object.values(selectedFilters).some(Boolean) ? "Clear the search or filters to review the full workspace." : config.emptyDescription}</p></div></div>}
        </section>

        <section className="ops-callout"><ShieldCheck size={16} /><div><strong>Data truth is visible by design.</strong><p>Provider-backed records, status transitions, and client-safe visibility will be connected to this surface as their typed domain models are introduced. This screen does not imply live CRM data where none is connected.</p></div></section>
      </div>
    </AppShell>
  );
}
