"use client";

import { useState } from "react";
import { Check, Filter, RotateCcw, SlidersHorizontal, X } from "lucide-react";

export type DashboardFilterState = {
  channel: "All channels" | "Organic search" | "Local / GBP" | "Content & technical";
  metric: "All KPIs" | "Traffic" | "Visibility" | "Demand";
  source: "All sources" | "GA4" | "GSC" | "GBP" | "DATAFORSEO" | "MANUAL";
};

export const defaultDashboardFilters: DashboardFilterState = { channel: "All channels", metric: "All KPIs", source: "All sources" };

export function DashboardControls({ onViewChange, onFiltersChange, getResultCount }: { onViewChange?: (view: string) => void; onFiltersChange?: (filters: DashboardFilterState) => void; getResultCount?: (filters: DashboardFilterState) => number }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState("Executive overview");
  const [filters, setFilters] = useState<DashboardFilterState>(defaultDashboardFilters);
  const [draftFilters, setDraftFilters] = useState<DashboardFilterState>(defaultDashboardFilters);
  const activeFilterCount = Object.values(filters).filter((value) => !value.startsWith("All ")).length;
  const previewCount = getResultCount?.(draftFilters) ?? 0;
  const appliedCount = getResultCount?.(filters) ?? 0;

  function changeView(nextView: string) {
    setView(nextView);
    onViewChange?.(nextView);
  }

  function toggleFilters() {
    setDraftFilters(filters);
    setOpen((current) => !current);
  }

  function applyFilters() {
    setFilters(draftFilters);
    onFiltersChange?.(draftFilters);
    setOpen(false);
  }

  function clearFilters() {
    setDraftFilters(defaultDashboardFilters);
    setFilters(defaultDashboardFilters);
    onFiltersChange?.(defaultDashboardFilters);
  }

  return <section className="card dashboard-controls" aria-label="Dashboard filters and client view settings">
    <div className="dashboard-controls-head"><div><p className="eyebrow">Dashboard controls</p><h2>Reporting filters</h2><p>Set the view, channel, KPI group, and source scope for this dashboard.</p></div><div className="dashboard-controls-actions"><span className="dashboard-filter-count" aria-live="polite"><Filter size={12} /> {appliedCount} matching signals</span><button className={`button${open ? " primary" : ""}`} type="button" onClick={toggleFilters}><SlidersHorizontal size={14} /> {open ? "Close filters" : "Advanced filters"}{activeFilterCount > 0 ? <span className="filter-count-badge">{activeFilterCount}</span> : null}</button></div></div>
    <div className="dashboard-view-tabs" role="tablist" aria-label="Dashboard views">{["Executive overview", "SEO performance", "Local visibility", "Client tasks"].map((item) => <button key={item} type="button" role="tab" aria-selected={view === item} className={view === item ? "active" : ""} onClick={() => changeView(item)}>{view === item ? <Check size={13} /> : null}{item}</button>)}</div>
    {open && <div className="dashboard-filter-drawer" aria-label="Advanced dashboard filters">
      <div className="dashboard-filter-drawer-head"><div><strong>Filter the dashboard signals</strong><span>Choose a scope, then apply it to the KPI cards and visibility ranking.</span></div><button className="icon-button dashboard-filter-close" type="button" aria-label="Close advanced filters" onClick={() => setOpen(false)}><X size={15} /></button></div>
      <div className="dashboard-filter-grid">
        <label>Channel<select value={draftFilters.channel} onChange={(event) => setDraftFilters((current) => ({ ...current, channel: event.target.value as DashboardFilterState["channel"] }))}><option>All channels</option><option>Organic search</option><option>Local / GBP</option><option>Content & technical</option></select></label>
        <label>Metric focus<select value={draftFilters.metric} onChange={(event) => setDraftFilters((current) => ({ ...current, metric: event.target.value as DashboardFilterState["metric"] }))}><option>All KPIs</option><option>Traffic</option><option>Visibility</option><option>Demand</option></select></label>
        <label>Data source<select value={draftFilters.source} onChange={(event) => setDraftFilters((current) => ({ ...current, source: event.target.value as DashboardFilterState["source"] }))}><option>All sources</option><option>GA4</option><option>GSC</option><option>GBP</option><option>DATAFORSEO</option><option>MANUAL</option></select></label>
      </div>
      <div className="dashboard-filter-drawer-foot"><span className="dashboard-filter-note"><Check size={14} /> {previewCount} signals match these filters</span><div className="dashboard-filter-actions"><button className="button" type="button" onClick={clearFilters}><RotateCcw size={13} /> Clear all</button><button className="button primary" type="button" onClick={applyFilters}>Apply filters</button></div></div>
    </div>}
  </section>;
}
