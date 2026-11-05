"use client";

import { useState } from "react";
import { Check, SlidersHorizontal, X } from "lucide-react";

export function DashboardControls({ onViewChange }: { onViewChange?: (view: string) => void }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState("Executive overview");
  const [channel, setChannel] = useState("All channels");
  const [metric, setMetric] = useState("All KPIs");
  const [language, setLanguage] = useState("English (US)");

  function changeView(nextView: string) {
    setView(nextView);
    onViewChange?.(nextView);
  }

  return <section className="card dashboard-controls" aria-label="Dashboard filters and client view settings"><div className="dashboard-controls-head"><div><p className="eyebrow">Dashboard controls</p><h2>Reporting filters</h2><p>Set the view, channel, KPI group, and report language.</p></div><button className={`button${open ? " primary" : ""}`} type="button" onClick={() => setOpen((current) => !current)}><SlidersHorizontal size={14} /> {open ? "Close filters" : "Advanced filters"}</button></div><div className="dashboard-view-tabs" role="tablist" aria-label="Dashboard views">{["Executive overview", "SEO performance", "Local visibility", "Client tasks"].map((item) => <button key={item} type="button" role="tab" aria-selected={view === item} className={view === item ? "active" : ""} onClick={() => changeView(item)}>{view === item ? <Check size={13} /> : null}{item}</button>)}</div>{open && <div className="dashboard-filter-grid"><label>Channel<select value={channel} onChange={(event) => setChannel(event.target.value)}><option>All channels</option><option>Organic search</option><option>Local / GBP</option><option>Content & technical</option></select></label><label>Metric focus<select value={metric} onChange={(event) => setMetric(event.target.value)}><option>All KPIs</option><option>Traffic</option><option>Visibility</option><option>Demand</option></select></label><label>Report language<select value={language} onChange={(event) => setLanguage(event.target.value)}><option>English (US)</option><option>Spanish</option><option>French</option></select></label><button className="icon-button dashboard-filter-close" type="button" aria-label="Close advanced filters" onClick={() => setOpen(false)}><X size={15} /></button><div className="dashboard-filter-note"><Check size={14} /> {language} · {channel} · {metric}<span>Language selection is stored for this view. Translation content is not connected yet.</span></div></div>}</section>;
}
