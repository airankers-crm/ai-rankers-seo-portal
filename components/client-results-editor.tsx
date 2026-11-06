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
  name: string;
  description: string;
  value: string;
  periodStart: string;
  periodEnd: string;
  note: string;
  publish: boolean;
  isVisible: boolean;
};

const GBP_METRIC_TEMPLATES = [
  { key: "gbp-views", name: "Profile views", description: "Search and Maps profile views recorded by Google Business Profile.", valueFormat: "INTEGER", source: "GBP" },
  { key: "gbp-website-clicks", name: "Website clicks", description: "Website actions attributed to the Google Business Profile listing.", valueFormat: "INTEGER", source: "GBP" },
  { key: "gbp-directions", name: "Direction requests", description: "Requests for directions from the profile listing.", valueFormat: "INTEGER", source: "GBP" },
  { key: "gbp-reviews", name: "Reviews received", description: "New reviews received during the selected reporting window.", valueFormat: "INTEGER", source: "GBP" },
] as const;

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

function formatMetricValue(value: string | undefined, format: string) {
  if (value === undefined || value === "") return "No result";
  const number = Number(value);
  if (!Number.isFinite(number)) return value;
  if (format === "PERCENT") return `${number.toFixed(1)}%`;
  if (format === "CURRENCY") return `$${number.toLocaleString()}`;
  if (format === "DECIMAL") return number.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return number.toLocaleString();
}

function draftFor(metric: ResultMetric): MetricDraft {
  const latest = metric.values[0];
  const start = inputDate(latest?.periodStart, today());
  return {
    name: metric.name,
    description: metric.description ?? "",
    value: latest?.value ?? "",
    periodStart: start,
    periodEnd: inputDate(latest?.periodEnd, monthEnd(start)),
    note: latest?.note ?? "",
    publish: !metric.isDraft,
    isVisible: metric.isVisible,
  };
}

function replaceMetric(metrics: ResultMetric[], next: ResultMetric) {
  return metrics.map((metric) => metric.id === next.id ? next : metric);
}

export function ClientResultsEditor({ clientId, metrics: initialMetrics, sections }: { clientId: string; metrics: ResultMetric[]; sections: ResultSection[] }) {
  const [metrics, setMetrics] = useState(initialMetrics);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<MetricDraft | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newTemplateKey, setNewTemplateKey] = useState("");
  const [newPublish, setNewPublish] = useState(true);

  const gbpSection = sections.find((section) => section.kind === "GBP");
  const availableTemplates = useMemo(() => GBP_METRIC_TEMPLATES.filter((template) => !metrics.some((metric) => metric.key === template.key)), [metrics]);

  function beginEdit(metric: ResultMetric) {
    setEditingId(metric.id);
    setDraft(draftFor(metric));
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
      const body = await response.json().catch(() => null) as { error?: string; metric?: ResultMetric } | null;
      if (!response.ok || !body?.metric) {
        setError(body?.error ?? "The client result could not be saved.");
        return;
      }
      setMetrics((current) => replaceMetric(current, body.metric!));
      setDraft(draftFor(body.metric));
      setMessage(draft.publish ? "Result saved and published to the client portal." : "Result saved as a draft. The client will not see it yet.");
    } catch {
      setError("The result could not be saved. Check the connection and try again.");
    } finally {
      setPending(false);
    }
  }

  async function addMetric() {
    const template = availableTemplates.find((item) => item.key === newTemplateKey) ?? availableTemplates[0];
    if (!template || !gbpSection) return;
    setPending(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch(`/api/admin/clients/${clientId}/metrics`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key: template.key, name: template.name, description: template.description, sectionId: gbpSection.id, displayType: "NUMBER_CARD", valueFormat: template.valueFormat, source: template.source, publish: newPublish }),
      });
      const body = await response.json().catch(() => null) as { error?: string; metric?: ResultMetric } | null;
      if (!response.ok || !body?.metric) {
        setError(body?.error ?? "The result metric could not be added.");
        return;
      }
      setMetrics((current) => [...current, { ...body.metric!, sectionKind: gbpSection.kind, sectionName: gbpSection.name }]);
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
      <div><p className="eyebrow">Client presentation</p><h2 id="client-results-title">Client results editor</h2><p>Edit the values and context the client sees, then publish only when the report is approved.</p></div>
      <div className="results-heading-icon"><Gauge size={18} /></div>
    </div>
    <div className="results-editor-toolbar">
      <div className="results-editor-summary"><strong>{metrics.filter((metric) => !metric.isDraft && metric.isVisible).length}</strong><span>published results</span><i /> <strong>{metrics.filter((metric) => metric.isDraft).length}</strong><span>draft results</span></div>
      <div className="results-editor-actions"><a className="button" href={`/admin/clients/${clientId}/preview/gbp`}><Eye size={14} /> Preview client view</a>{availableTemplates.length > 0 && gbpSection ? <button className="button" type="button" onClick={() => { setAdding((current) => !current); setEditingId(null); setDraft(null); setError(""); }}><Plus size={14} /> Add local KPI</button> : null}</div>
    </div>

    {message && <p className="save-status results-feedback" role="status"><CheckCircle2 size={14} /> {message}</p>}
    {error && <p className="auth-error results-feedback" role="alert">{error}</p>}

    {adding && <div className="result-add-panel">
      <div><strong>Add a client-facing local KPI</strong><p>Use this for a verified GBP result you want to include in the local performance report.</p></div>
      <div className="result-add-controls"><label>Metric<select value={newTemplateKey || availableTemplates[0]?.key} onChange={(event) => setNewTemplateKey(event.target.value)}>{availableTemplates.map((template) => <option key={template.key} value={template.key}>{template.name}</option>)}</select></label><label className="result-check"><input type="checkbox" checked={newPublish} onChange={(event) => setNewPublish(event.target.checked)} /> Publish metric shell</label><button className="button primary" type="button" onClick={addMetric} disabled={pending}><Plus size={13} /> Add KPI</button><button className="icon-button" type="button" onClick={() => setAdding(false)} aria-label="Close add metric form"><X size={14} /></button></div>
    </div>}

    <div className="results-editor-layout">
      <div className="results-metric-list">
        {metrics.map((metric) => {
          const latest = metric.values[0];
          return <article className={`result-metric-card${editingId === metric.id ? " active" : ""}`} key={metric.id}>
            <div className="result-metric-card-top"><span className="result-section-tag">{metric.sectionName}</span><span className={`status ${metric.isDraft ? "progress" : "complete"}`}>{metric.isDraft ? "Draft" : "Published"}</span></div>
            <div className="result-metric-title-row"><div><h3>{metric.name}</h3><p>{metric.description || "No client-facing definition yet."}</p></div><span className="result-source">{metric.source}</span></div>
            <div className="result-metric-value-row"><div><span>Latest result</span><strong>{formatMetricValue(latest?.value, metric.valueFormat)}</strong></div><div><span>Reporting period</span><strong>{latest ? new Date(latest.periodStart).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "Not entered"}</strong></div></div>
            <div className="result-metric-card-foot"><span>{metric.isVisible ? <><Eye size={12} /> Visible to client</> : <><Eye size={12} /> Hidden from client</>}</span><button className="table-action" type="button" onClick={() => beginEdit(metric)}><Edit3 size={13} /> Edit result</button></div>
          </article>;
        })}
        {metrics.length === 0 && <div className="result-empty"><Flag size={16} /><div><strong>No client results yet</strong><p>Add a result metric to begin the presentation.</p></div></div>}
      </div>

      {editingId && draft && <aside className="result-edit-panel" aria-label="Edit client result">
        <div className="result-edit-panel-head"><div><p className="eyebrow">Edit result</p><h3>{draft.name}</h3><p>All changes are recorded in the admin audit log.</p></div><button className="icon-button" type="button" onClick={closeEditor} aria-label="Close result editor"><X size={14} /></button></div>
        <div className="result-edit-form">
          <label>Client-facing name<input value={draft.name} onChange={(event) => setDraft((current) => current ? { ...current, name: event.target.value } : current)} /></label>
          <label>Definition<textarea value={draft.description} onChange={(event) => setDraft((current) => current ? { ...current, description: event.target.value } : current)} rows={3} placeholder="Explain what this result measures." /></label>
          <div className="result-edit-grid"><label>Result value<input type="number" value={draft.value} onChange={(event) => setDraft((current) => current ? { ...current, value: event.target.value } : current)} step="any" required /></label><label>Source<span className="result-readonly">{metrics.find((metric) => metric.id === editingId)?.source ?? "—"} · recorded value</span></label></div>
          <div className="result-edit-grid"><label>Period start<input type="date" value={draft.periodStart} onChange={(event) => setDraft((current) => current ? { ...current, periodStart: event.target.value } : current)} required /></label><label>Period end<input type="date" value={draft.periodEnd} onChange={(event) => setDraft((current) => current ? { ...current, periodEnd: event.target.value } : current)} required /></label></div>
          <label>Client-facing note<textarea value={draft.note} onChange={(event) => setDraft((current) => current ? { ...current, note: event.target.value } : current)} rows={2} placeholder="Optional context for the reporting period." /></label>
          <label className="result-check"><input type="checkbox" checked={draft.isVisible} onChange={(event) => setDraft((current) => current ? { ...current, isVisible: event.target.checked } : current)} /> Show this result in the client portal</label>
          <label className="result-publish-toggle"><input type="checkbox" checked={draft.publish} onChange={(event) => setDraft((current) => current ? { ...current, publish: event.target.checked } : current)} /><span><strong>{draft.publish ? "Publish to client" : "Keep as draft"}</strong><small>{draft.publish ? "The approved result will be visible in the client dashboard." : "The result stays in admin until it is approved."}</small></span></label>
          <div className="result-edit-actions"><button className="button" type="button" onClick={closeEditor}>Cancel</button><button className="button primary" type="button" onClick={saveMetric} disabled={pending}><Save size={13} /> {pending ? "Saving…" : draft.publish ? "Save & publish" : "Save draft"}</button></div>
        </div>
      </aside>}
    </div>
    <div className="results-editor-note"><Sparkles size={14} /><span>Use this workspace to prepare the client-facing presentation. Provider integrations can replace these recorded values later without changing the client report layout.</span></div>
  </section>;
}
