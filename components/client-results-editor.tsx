"use client";

import { CheckCircle2, Edit3, Eye, Flag, Gauge, Plus, Save, Sparkles, X } from "lucide-react";
import { useMemo, useState } from "react";

type ResultValue = {
  id: string;
  periodStart: string;
  periodEnd: string;
  value: string;
  source: string;
  note: string | null;
  isOverride: boolean;
};

type ResultMetric = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  sectionId: string;
  sectionKind: string;
  sectionName: string;
  displayType: string;
  valueFormat: string;
  source: string;
  higherIsBetter: boolean;
  isVisible: boolean;
  isDraft: boolean;
  values: ResultValue[];
};

type ResultSection = { id: string; name: string; kind: string };

type MetricDraft = {
  valueId: string | null;
  name: string;
  description: string;
  value: string;
  periodStart: string;
  periodEnd: string;
  note: string;
  publish: boolean;
  isVisible: boolean;
};

const WEBSITE_METRIC_TEMPLATES = [
  { key: "ga4-organic-sessions", name: "Organic traffic", description: "Sessions attributed to organic search in the selected reporting window.", valueFormat: "INTEGER", source: "GA4" },
  { key: "gsc-impressions", name: "Search impressions", description: "Search results impressions recorded by Google Search Console.", valueFormat: "INTEGER", source: "GSC" },
  { key: "kw-top10", name: "Keywords in top 10", description: "Tracked keywords currently appearing within the first ten organic results.", valueFormat: "RANK", source: "DATAFORSEO" },
] as const;

const GBP_METRIC_TEMPLATES = [
  { key: "gbp-calls", name: "GBP calls", description: "Calls attributed to the connected Google Business Profile source.", valueFormat: "INTEGER", source: "GBP" },
  { key: "gbp-views", name: "Profile views", description: "Search and Maps profile views recorded by Google Business Profile.", valueFormat: "INTEGER", source: "GBP" },
  { key: "gbp-website-clicks", name: "Website clicks", description: "Website actions attributed to the Google Business Profile listing.", valueFormat: "INTEGER", source: "GBP" },
  { key: "gbp-directions", name: "Direction requests", description: "Requests for directions from the profile listing.", valueFormat: "INTEGER", source: "GBP" },
  { key: "gbp-reviews", name: "Reviews received", description: "New reviews received during the selected reporting window.", valueFormat: "INTEGER", source: "GBP" },
] as const;

export type EditorView = "website" | "gbp" | "all";

function metricView(metric: ResultMetric): Exclude<EditorView, "all"> | "other" {
  if (metric.key.startsWith("gbp-") || metric.sectionKind === "GBP") return "gbp";
  if (metric.key === "ga4-organic-sessions" || metric.key === "gsc-impressions" || metric.key === "kw-top10" || metric.key.startsWith("ga4-channel-") || metric.sectionKind === "WEBSITE") return "website";
  return "other";
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function monthEnd(date: string) {
  const [year, month] = date.split("-").map(Number);
  return `${year}-${String(month).padStart(2, "0")}-${String(new Date(Date.UTC(year, month, 0)).getUTCDate()).padStart(2, "0")}`;
}

function inputDate(value: string | undefined, fallback: string) {
  return value ? new Date(value).toISOString().slice(0, 10) : fallback;
}

function formatPeriodLabel(value: string) {
  return new Date(value).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", year: "numeric" });
}

function formatMetricValue(value: string | undefined, format: string) {
  if (value === undefined || value === "") return "No result";
  const number = Number(value);
  if (!Number.isFinite(number)) return value;
  if (format === "PERCENT") return `${number.toFixed(1)}%`;
  if (format === "CURRENCY") return `$${number.toLocaleString()}`;
  if (format === "DECIMAL") return number.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return number.toLocaleString();
}

function draftFor(metric: ResultMetric, valueId = metric.values[0]?.id): MetricDraft {
  const selected = metric.values.find((value) => value.id === valueId) ?? metric.values[0];
  const start = inputDate(selected?.periodStart, today());
  return {
    valueId: selected?.id ?? null,
    name: metric.name,
    description: metric.description ?? "",
    value: selected?.value ?? "",
    periodStart: start,
    periodEnd: inputDate(selected?.periodEnd, monthEnd(start)),
    note: selected?.note ?? "",
    publish: !metric.isDraft,
    isVisible: metric.isVisible,
  };
}

function replaceMetric(metrics: ResultMetric[], next: ResultMetric) {
  return metrics.map((metric) => metric.id === next.id ? next : metric);
}

function draftsMatch(left: MetricDraft, right: MetricDraft) {
  return left.valueId === right.valueId && left.name === right.name && left.description === right.description && left.value === right.value && left.periodStart === right.periodStart && left.periodEnd === right.periodEnd && left.note === right.note && left.publish === right.publish && left.isVisible === right.isVisible;
}

export function ClientResultsEditor({ clientId, metrics: initialMetrics, sections, initialView = "all" }: { clientId: string; metrics: ResultMetric[]; sections: ResultSection[]; initialView?: EditorView }) {
  const [metrics, setMetrics] = useState(initialMetrics);
  const defaultView = initialMetrics.some((metric) => metricView(metric) === "website") ? "website" : "gbp";
  const [activeView, setActiveView] = useState<EditorView>(initialView === "all" || initialMetrics.some((metric) => metricView(metric) === initialView) ? initialView : defaultView);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<MetricDraft | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newTemplateKey, setNewTemplateKey] = useState("");
  const [newPublish, setNewPublish] = useState(true);

  const websiteSection = sections.find((section) => section.kind === "WEBSITE");
  const gbpSection = sections.find((section) => section.kind === "GBP");
  const websiteMetrics = metrics.filter((metric) => metricView(metric) === "website");
  const gbpMetrics = metrics.filter((metric) => metricView(metric) === "gbp");
  const filteredMetrics = activeView === "all" ? metrics : metrics.filter((metric) => metricView(metric) === activeView);
  const availableTemplates = useMemo(() => {
    const templates = activeView === "website" ? WEBSITE_METRIC_TEMPLATES : activeView === "gbp" ? GBP_METRIC_TEMPLATES : [];
    return templates.filter((template) => !metrics.some((metric) => metric.key === template.key));
  }, [activeView, metrics]);
  const addSection = activeView === "website" ? websiteSection : activeView === "gbp" ? gbpSection : null;
  const activeViewLabel = activeView === "website" ? "Website SEO" : activeView === "gbp" ? "GBP performance" : "All results";
  const activePreview = activeView === "website" ? `/admin/clients/${clientId}/preview/website-seo?mode=draft` : `/admin/clients/${clientId}/preview/gbp?mode=draft`;
  const activePortal = activeView === "website" ? "/portal/website-seo" : "/portal/gbp";
  const activeMetric = editingId ? metrics.find((metric) => metric.id === editingId) ?? null : null;
  const isDirty = Boolean(activeMetric && draft && !draftsMatch(draft, draftFor(activeMetric)));

  function beginEdit(metric: ResultMetric) {
    setEditingId(metric.id);
    setDraft(draftFor(metric));
    setAdding(false);
    setMessage("");
    setError("");
  }

  function beginNewPeriod(metric: ResultMetric) {
    const start = today();
    const base = draftFor(metric);
    setEditingId(metric.id);
    setDraft({ ...base, valueId: null, value: "", periodStart: start, periodEnd: monthEnd(start), note: "", publish: false });
    setAdding(false);
    setMessage("");
    setError("");
  }

  function closeEditor() {
    setEditingId(null);
    setDraft(null);
  }

  async function saveMetric() {
    if (!editingId || !draft) return;
    setPending(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch(`/api/admin/clients/${clientId}/metrics/${editingId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft),
      });
      const body = await response.json().catch(() => null) as { error?: string; metric?: ResultMetric; savedValueId?: string } | null;
      if (!response.ok || !body?.metric) {
        setError(body?.error ?? "The client result could not be saved.");
        return;
      }
      setMetrics((current) => replaceMetric(current, body.metric!));
      setDraft(draftFor(body.metric!, body.savedValueId));
      setMessage(draft.publish ? "Result saved and published to the client portal." : "Result saved as a draft. The client will not see it yet.");
    } catch {
      setError("The result could not be saved. Check the connection and try again.");
    } finally {
      setPending(false);
    }
  }

  async function addMetric() {
    const template = availableTemplates.find((item) => item.key === newTemplateKey) ?? availableTemplates[0];
    if (!template || !addSection) return;
    setPending(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch(`/api/admin/clients/${clientId}/metrics`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key: template.key, name: template.name, description: template.description, sectionId: addSection.id, displayType: "NUMBER_CARD", valueFormat: template.valueFormat, source: template.source, publish: newPublish }),
      });
      const body = await response.json().catch(() => null) as { error?: string; metric?: ResultMetric } | null;
      if (!response.ok || !body?.metric) {
        setError(body?.error ?? "The result metric could not be added.");
        return;
      }
      setMetrics((current) => [...current, { ...body.metric!, sectionKind: addSection.kind, sectionName: addSection.name }]);
      setNewTemplateKey("");
      setAdding(false);
      setMessage(newPublish ? "Metric added. Enter its first result before publishing the report." : "Metric added as a draft.");
    } catch {
      setError("The result metric could not be added. Check the connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return <section className="card panel client-results-editor" aria-labelledby="client-results-title">
    <div className="panel-heading">
      <div><p className="eyebrow">Client presentation</p><h2 id="client-results-title">Performance editors</h2><p>Edit Website SEO and GBP performance results separately, then publish only when each report is approved.</p></div>
      <div className="results-heading-icon"><Gauge size={18} /></div>
    </div>
    <div className="results-editor-tabs" role="tablist" aria-label="Client performance editors">
      <button className={activeView === "website" ? "active" : ""} type="button" role="tab" aria-selected={activeView === "website"} onClick={() => { setActiveView("website"); setAdding(false); setEditingId(null); setDraft(null); }}>Website SEO <span>{websiteMetrics.length}</span></button>
      <button className={activeView === "gbp" ? "active" : ""} type="button" role="tab" aria-selected={activeView === "gbp"} onClick={() => { setActiveView("gbp"); setAdding(false); setEditingId(null); setDraft(null); }}>GBP performance <span>{gbpMetrics.length}</span></button>
      <button className={activeView === "all" ? "active" : ""} type="button" role="tab" aria-selected={activeView === "all"} onClick={() => { setActiveView("all"); setAdding(false); setEditingId(null); setDraft(null); }}>All results <span>{metrics.length}</span></button>
    </div>
    <div className="results-editor-toolbar">
      <div className="results-editor-summary"><strong>{filteredMetrics.filter((metric) => !metric.isDraft && metric.isVisible).length}</strong><span>published in {activeViewLabel}</span><i /> <strong>{filteredMetrics.filter((metric) => metric.isDraft).length}</strong><span>draft results</span></div>
      <div className="results-editor-actions"><a className="button" href={activePreview} target="_blank" rel="noreferrer"><Eye size={14} /> Preview draft</a><a className="button" href={activePortal} target="_blank" rel="noreferrer">View live portal</a>{availableTemplates.length > 0 && addSection ? <button className="button" type="button" onClick={() => { setAdding((current) => !current); setEditingId(null); setDraft(null); setError(""); }}><Plus size={14} /> Add {activeViewLabel} metric</button> : null}</div>
    </div>

    {message && <p className="save-status results-feedback" role="status"><CheckCircle2 size={14} /> {message}</p>}
    {error && <p className="auth-error results-feedback" role="alert">{error}</p>}

    {adding && <div className="result-add-panel">
      <div><strong>Add a client-facing {activeViewLabel} metric</strong><p>Use this for a verified result you want to include in the {activeViewLabel} client report.</p></div>
      <div className="result-add-controls"><label>Metric<select value={newTemplateKey || availableTemplates[0]?.key} onChange={(event) => setNewTemplateKey(event.target.value)}>{availableTemplates.map((template) => <option key={template.key} value={template.key}>{template.name}</option>)}</select></label><label className="result-check"><input type="checkbox" checked={newPublish} onChange={(event) => setNewPublish(event.target.checked)} /> Publish metric shell</label><button className="button primary" type="button" onClick={addMetric} disabled={pending}><Plus size={13} /> Add KPI</button><button className="icon-button" type="button" onClick={() => setAdding(false)} aria-label="Close add metric form"><X size={14} /></button></div>
    </div>}

    <div className={`results-editor-layout${editingId ? " has-editor" : ""}`}>
      <div className="results-metric-list">
        {filteredMetrics.map((metric) => {
          const latest = metric.values[0];
          return <article className={`result-metric-card${editingId === metric.id ? " active" : ""}`} key={metric.id}>
            <div className="result-metric-card-top"><span className="result-section-tag">{metric.sectionName}</span><span className={`status ${metric.isDraft ? "progress" : "complete"}`}>{metric.isDraft ? "Draft" : "Published"}</span></div>
            <div className="result-metric-title-row"><div><h3>{metric.name}</h3><p>{metric.description || "No client-facing definition yet."}</p></div><span className="result-source">{metric.source}</span></div>
            <div className="result-metric-value-row"><div><span>Latest result</span><strong>{formatMetricValue(latest?.value, metric.valueFormat)}</strong></div><div><span>Reporting period</span><strong>{latest ? formatPeriodLabel(latest.periodStart) : "Not entered"}</strong></div></div>
            <div className="result-metric-card-foot"><span>{metric.isVisible ? <><Eye size={12} /> Visible to client</> : <><Eye size={12} /> Hidden from client</>}</span><button className="table-action" type="button" onClick={() => beginEdit(metric)}><Edit3 size={13} /> Edit result</button></div>
          </article>;
        })}
        {filteredMetrics.length === 0 && <div className="result-empty"><Flag size={16} /><div><strong>No {activeViewLabel} results yet</strong><p>{availableTemplates.length > 0 && addSection ? `Add a ${activeViewLabel} metric to begin this presentation.` : "Add a result metric to begin the presentation."}</p></div></div>}
      </div>

      {editingId && draft && activeMetric && <aside className="result-edit-panel" aria-label="Edit client result">
        <div className="result-edit-panel-head"><div><p className="eyebrow">Property editor</p><h3>{draft.name}</h3><p>{isDirty ? "Unsaved changes" : "All changes are saved"} · recorded in the admin audit log.</p></div><button className="icon-button" type="button" onClick={closeEditor} aria-label="Close result editor"><X size={14} /></button></div>
        <div className="result-period-picker">
          <div className="result-period-picker-heading"><div><strong>Reporting periods</strong><small>Choose a period to edit its chart and table value.</small></div><button className="table-action" type="button" onClick={() => beginNewPeriod(activeMetric)} disabled={isDirty}><Plus size={12} /> New period</button></div>
          <div className="result-period-list">{activeMetric.values.map((value) => <button className={draft.valueId === value.id ? "active" : ""} key={value.id} type="button" onClick={() => setDraft(draftFor(activeMetric, value.id))} disabled={isDirty && draft.valueId !== value.id}><span>{formatPeriodLabel(value.periodStart)}</span><strong>{formatMetricValue(value.value, activeMetric.valueFormat)}</strong></button>)}{activeMetric.values.length === 0 && <span className="result-period-empty">No reporting periods yet.</span>}</div>
        </div>
        <form className="result-edit-form" onSubmit={(event) => { event.preventDefault(); void saveMetric(); }}>
          <div className="result-edit-section"><div className="result-edit-section-heading"><span>01</span><div><strong>Presentation identity</strong><small>How this result appears in the client report.</small></div></div><label>Client-facing name<input value={draft.name} onChange={(event) => setDraft((current) => current ? { ...current, name: event.target.value } : current)} maxLength={80} required /></label><label>Definition<textarea value={draft.description} onChange={(event) => setDraft((current) => current ? { ...current, description: event.target.value } : current)} rows={3} placeholder="Explain what this result measures." /></label></div>
          <div className="result-edit-section"><div className="result-edit-section-heading"><span>02</span><div><strong>Reporting value</strong><small>Set the approved value and reporting period.</small></div></div><div className="result-edit-grid"><label>Result value<input type="number" value={draft.value} onChange={(event) => setDraft((current) => current ? { ...current, value: event.target.value } : current)} step="any" required /></label><label>Source<span className="result-readonly">{activeMetric.source} · recorded value</span></label></div><div className="result-edit-grid"><label>Period start<input type="date" value={draft.periodStart} onChange={(event) => setDraft((current) => current ? { ...current, periodStart: event.target.value } : current)} required /></label><label>Period end<input type="date" value={draft.periodEnd} onChange={(event) => setDraft((current) => current ? { ...current, periodEnd: event.target.value } : current)} required /></label></div><label>Client-facing note<textarea value={draft.note} onChange={(event) => setDraft((current) => current ? { ...current, note: event.target.value } : current)} rows={2} placeholder="Optional context for the reporting period." /></label></div>
          <div className="result-edit-section"><div className="result-edit-section-heading"><span>03</span><div><strong>Publishing controls</strong><small>Control what the client can see.</small></div></div><label className="result-check"><input type="checkbox" checked={draft.isVisible} onChange={(event) => setDraft((current) => current ? { ...current, isVisible: event.target.checked } : current)} /> Show this result in the client portal</label><label className="result-publish-toggle"><input type="checkbox" checked={draft.publish} onChange={(event) => setDraft((current) => current ? { ...current, publish: event.target.checked } : current)} /><span><strong>{draft.publish ? "Publish to client" : "Keep as draft"}</strong><small>{draft.publish ? "The approved result will be visible in the client dashboard." : "The result stays in admin until it is approved."}</small></span></label></div>
          <div className="result-edit-actions"><button className="button" type="button" onClick={closeEditor}>Cancel</button><button className="button primary" type="submit" disabled={pending || !isDirty}><Save size={13} /> {pending ? "Saving…" : draft.publish ? "Save & publish" : "Save draft"}</button></div>
        </form>
      </aside>}
    </div>
    <div className="results-editor-note"><Sparkles size={14} /><span>Use this workspace to prepare the client-facing presentation. Provider integrations can replace these recorded values later without changing the client report layout.</span></div>
  </section>;
}
