"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, BarChart3, CheckCircle2, FileText, Globe2, MapPin, Pencil, Plus, Save, ShieldCheck, SlidersHorizontal, Sparkles, Target } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "./app-shell";
import type { ReportTemplateConfig, ReportTemplateKind } from "../lib/report-templates";

type TemplateFilter = "All" | "Website SEO" | "GBP performance";
type TemplateVersionStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
type TemplateVersion = { id: string; version: number; label: string; status: TemplateVersionStatus; config: unknown };
type ReportTemplateRecord = { id: string; key: ReportTemplateKind; category: Exclude<TemplateFilter, "All">; title: string; description: string; versions: TemplateVersion[]; assignments: { clientId: string; service: string; versionId: string }[] };

function isTemplateConfig(value: unknown): value is ReportTemplateConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const config = value as Partial<ReportTemplateConfig>;
  return typeof config.coverTitle === "string" && typeof config.coverDescription === "string" && Array.isArray(config.sections) && Array.isArray(config.metrics);
}

function configOf(version: TemplateVersion | undefined): ReportTemplateConfig {
  if (version && isTemplateConfig(version.config)) return version.config;
  return { coverTitle: "Report preview", coverDescription: "Client-facing report structure", sections: [], metrics: [] };
}

function latestVersion(template: ReportTemplateRecord) {
  return template.versions.find((version) => version.status === "PUBLISHED") ?? template.versions[0];
}

export function AdminReportTemplate({ clientId, clientName, initialTemplateKey, initialVersionId, initialTemplates }: { clientId?: string; clientName?: string; initialTemplateKey?: string; initialVersionId?: string; initialTemplates: ReportTemplateRecord[] }) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [filter, setFilter] = useState<TemplateFilter>("All");
  const [activeId, setActiveId] = useState<ReportTemplateKind>((initialTemplates.find((template) => template.id === initialTemplateKey)?.key ?? initialTemplates[0]?.key ?? "website-seo") as ReportTemplateKind);
  const [selectedVersionId, setSelectedVersionId] = useState(initialVersionId);
  const [editing, setEditing] = useState(false);
  const [draftLabel, setDraftLabel] = useState("");
  const [draftConfig, setDraftConfig] = useState<ReportTemplateConfig | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const visibleTemplates = useMemo(() => filter === "All" ? templates : templates.filter((template) => template.category === filter), [filter, templates]);
  const activeTemplate = templates.find((template) => template.key === activeId) ?? templates[0];
  const activeVersion = activeTemplate?.versions.find((version) => version.id === selectedVersionId) ?? (activeTemplate ? latestVersion(activeTemplate) : undefined);
  const activeConfig = draftConfig ?? configOf(activeVersion);

  function selectTemplate(key: ReportTemplateKind) {
    setActiveId(key); setSelectedVersionId(undefined); setEditing(false); setDraftConfig(null); setNotice("");
  }

  function startEditing() {
    if (!activeVersion) return;
    setDraftConfig(configOf(activeVersion)); setDraftLabel(activeVersion.status === "DRAFT" ? activeVersion.label : `Draft v${activeVersion.version + 1}`); setEditing(true); setNotice("");
  }

  async function createDraft() {
    if (!activeTemplate || !activeVersion) return;
    setBusy(true); setNotice("");
    const response = await fetch(`/api/admin/templates/${activeTemplate.id}/versions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label: `Draft v${activeVersion.version + 1}`, config: configOf(activeVersion) }) });
    const payload = await response.json().catch(() => null) as { version?: TemplateVersion; error?: string } | null;
    setBusy(false);
    if (!response.ok || !payload?.version) { setNotice(payload?.error ?? "Could not create a draft version."); return; }
    setTemplates((items) => items.map((template) => template.id === activeTemplate.id ? { ...template, versions: [payload.version!, ...template.versions] } : template)); setSelectedVersionId(payload.version.id); setDraftLabel(payload.version.label); setDraftConfig(configOf(payload.version)); setEditing(true); setNotice("Draft version created. Published reports remain unchanged.");
  }

  async function saveDraft() {
    if (!activeTemplate || !activeVersion || activeVersion.status !== "DRAFT" || !draftConfig) return;
    setBusy(true); setNotice("");
    const response = await fetch(`/api/admin/templates/${activeTemplate.id}/versions/${activeVersion.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label: draftLabel, config: draftConfig }) });
    const payload = await response.json().catch(() => null) as { version?: TemplateVersion; error?: string } | null;
    setBusy(false);
    if (!response.ok || !payload?.version) { setNotice(payload?.error ?? "Could not save this draft."); return; }
    setTemplates((items) => items.map((template) => template.id === activeTemplate.id ? { ...template, versions: template.versions.map((version) => version.id === activeVersion.id ? payload.version! : version) } : template)); setDraftConfig(configOf(payload.version)); setNotice("Draft saved. Preview it before publishing.");
  }

  async function publishDraft() {
    if (!activeTemplate || !activeVersion || activeVersion.status !== "DRAFT") return;
    setBusy(true); setNotice("");
    const response = await fetch(`/api/admin/templates/${activeTemplate.id}/versions/${activeVersion.id}`, { method: "POST" });
    const payload = await response.json().catch(() => null) as { version?: TemplateVersion; error?: string } | null;
    setBusy(false);
    if (!response.ok || !payload?.version) { setNotice(payload?.error ?? "Could not publish this version."); return; }
    setTemplates((items) => items.map((template) => template.id === activeTemplate.id ? { ...template, versions: template.versions.map((version) => version.id === activeVersion.id ? payload.version! : version).map((version) => version.id === activeVersion.id ? version : version.status === "PUBLISHED" ? { ...version, status: "ARCHIVED" as const } : version) } : template)); setEditing(false); setDraftConfig(null); setNotice(`Version ${payload.version.version} is now the approved template. Existing client reports were not changed.`);
  }

  async function assignToClient() {
    if (!activeTemplate || !activeVersion || !clientId || activeVersion.status !== "PUBLISHED") return;
    setBusy(true); setNotice("");
    const response = await fetch(`/api/admin/templates/${activeTemplate.id}/assign`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientId, versionId: activeVersion.id, service: activeTemplate.category }) });
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    setBusy(false); setNotice(response.ok ? `${activeTemplate.title} v${activeVersion.version} assigned to ${clientName ?? "the client"}.` : payload?.error ?? "Could not assign the template.");
  }

  function updateConfig(update: Partial<ReportTemplateConfig>) { setDraftConfig((current) => ({ ...(current ?? activeConfig), ...update })); }
  function updateSection(index: number, update: Partial<ReportTemplateConfig["sections"][number]>) { updateConfig({ sections: activeConfig.sections.map((section, sectionIndex) => sectionIndex === index ? { ...section, ...update } : section) }); }

  const previewHref = activeTemplate && activeVersion && clientId ? `/admin/templates/${activeTemplate.id}/preview?versionId=${activeVersion.id}&clientId=${clientId}` : "/admin/clients";
  const editorOpen = editing && activeVersion?.status === "DRAFT";

  return <AppShell mode="admin"><div className="content admin-template-page">
    <div className="page-heading"><div><p className="eyebrow">Super Admin · Reporting system</p><h1>Report templates</h1><p>Build, version, preview, and approve the same client-safe report structure used in the portal.</p></div><div className="heading-actions"><Link className="button" href="/admin/reports">Open report operations <ArrowUpRight size={14} /></Link></div></div>
    <section className="card admin-template-intro"><div className="admin-template-intro-mark"><Sparkles size={18} /></div><div><strong>Versioned client report library</strong><span>Draft a future version, preview the full client report, then publish it only when the presentation is approved.</span></div><span className="status complete"><CheckCircle2 size={12} /> {templates.length} template families</span></section>
    {notice && <div className="admin-template-notice" role="status">{notice}</div>}
    <div className="admin-template-library"><section className="card admin-template-catalog" aria-labelledby="template-catalog-title"><div className="admin-template-catalog-head"><div><p className="eyebrow">Template library</p><h2 id="template-catalog-title">Choose a reporting structure</h2></div><SlidersHorizontal size={17} color="#6f3fb5" /></div><div className="admin-template-filters" role="tablist" aria-label="Report template categories">{(["All", "Website SEO", "GBP performance"] as TemplateFilter[]).map((item) => <button key={item} className={filter === item ? "active" : ""} type="button" role="tab" aria-selected={filter === item} onClick={() => { setFilter(item); if (item !== "All") selectTemplate(item === "Website SEO" ? "website-seo" : "gbp"); }}>{item}</button>)}</div><div className="admin-template-grid">{visibleTemplates.map((template) => <button className={`admin-template-card${template.key === activeTemplate?.key ? " active" : ""}`} type="button" key={template.id} onClick={() => selectTemplate(template.key)} aria-pressed={template.key === activeTemplate?.key}><span className={`admin-template-card-icon ${template.key === "website-seo" ? "purple" : "teal"}`}>{template.key === "website-seo" ? <Globe2 size={17} /> : <MapPin size={17} />}</span><span className="admin-template-card-copy"><strong>{template.title}</strong><small>{template.description}</small></span><span className="admin-template-card-meta"><span>{configOf(latestVersion(template)).sections.length} sections</span><span>{configOf(latestVersion(template)).metrics.length} metrics</span></span><ArrowUpRight size={14} className="admin-template-card-arrow" /></button>)}</div></section>
      {activeTemplate && activeVersion && <aside className={`card admin-template-detail ${activeTemplate.key === "website-seo" ? "purple" : "teal"}`} aria-labelledby="template-detail-title"><div className="admin-template-detail-top"><span className="admin-template-detail-eyebrow">{activeTemplate.category}</span><span className={`status ${activeVersion.status === "PUBLISHED" ? "complete" : activeVersion.status === "DRAFT" ? "progress" : "neutral"}`}>{activeVersion.status}</span></div><div className="admin-template-detail-brand"><Image src="/branding/ai-rankers/brand_logo.png" alt="The AI Rankers" width={132} height={43} priority /></div><h2 id="template-detail-title">{activeTemplate.title}</h2><p>{activeTemplate.description}</p><label className="admin-template-version-select">Version<select value={activeVersion.id} onChange={(event) => { setSelectedVersionId(event.target.value); setEditing(false); setDraftConfig(null); }} aria-label="Select report template version">{activeTemplate.versions.map((version) => <option value={version.id} key={version.id}>v{version.version} · {version.label} · {version.status}</option>)}</select></label><div className="admin-template-detail-stats"><div><strong>{activeConfig.sections.filter((section) => section.visible).length}</strong><span>visible sections</span></div><div><strong>{activeConfig.metrics.length}</strong><span>core metrics</span></div></div><div className="admin-template-detail-list"><strong>Included in this version</strong>{activeConfig.sections.filter((section) => section.visible).map((section) => <span key={section.key}><CheckCircle2 size={13} />{section.label}</span>)}</div><div className="admin-template-detail-actions"><Link className="button" href={previewHref}>Preview full report <ArrowUpRight size={13} /></Link>{activeVersion.status === "DRAFT" ? <button className="button primary" type="button" onClick={startEditing}><Pencil size={13} /> Edit version</button> : <button className="button primary" type="button" onClick={createDraft} disabled={busy}><Plus size={13} /> Create next version</button>}</div><div className="admin-template-assignment"><span>{clientName ? `Client workspace: ${clientName}` : "Create a client workspace to apply a template."}</span><button type="button" onClick={assignToClient} disabled={busy || activeVersion.status !== "PUBLISHED" || !clientId}>Apply approved version</button></div>{clientId && <Link className="admin-template-editor-link" href={`/admin/clients/${clientId}?section=${activeTemplate.key === "website-seo" ? "website" : "gbp"}#client-results-title`}>Open client result editor <ArrowUpRight size={12} /></Link>}</aside>}
    </div>
    {editorOpen && <section className="card admin-template-editor" aria-labelledby="template-editor-title"><div className="panel-heading"><div><p className="eyebrow">Draft version editor</p><h2 id="template-editor-title">Edit the future client report</h2><p>These changes belong to the draft only. The current published version remains unchanged until you publish.</p></div><span className="status progress">Draft v{activeVersion?.version}</span></div><div className="admin-template-editor-grid"><label>Version label<input value={draftLabel} onChange={(event) => setDraftLabel(event.target.value)} maxLength={120} /></label><label>Client-facing cover title<input value={activeConfig.coverTitle} onChange={(event) => updateConfig({ coverTitle: event.target.value })} maxLength={120} /></label><label className="wide">Client-facing description<textarea value={activeConfig.coverDescription} onChange={(event) => updateConfig({ coverDescription: event.target.value })} rows={3} maxLength={240} /></label></div><div className="admin-template-section-editor"><div className="panel-heading"><div><h3>Report sections</h3><p>Rename a section or hide it from this version’s preview.</p></div><FileText size={18} color="#f26b38" /></div>{activeConfig.sections.map((section, index) => <div className="admin-template-section-row" key={section.key}><input value={section.label} onChange={(event) => updateSection(index, { label: event.target.value })} aria-label={`${section.key} section label`} /><span>{section.description}</span><label><input type="checkbox" checked={section.visible} onChange={(event) => updateSection(index, { visible: event.target.checked })} /> Visible</label></div>)}</div><div className="admin-template-editor-actions"><button className="button" type="button" onClick={() => { setEditing(false); setDraftConfig(null); }}>Cancel</button><button className="button" type="button" onClick={saveDraft} disabled={busy}><Save size={13} /> Save draft</button><Link className="button" href={previewHref}>Preview draft</Link><button className="button primary" type="button" onClick={publishDraft} disabled={busy}>Publish approved version</button></div></section>}
    <section className="admin-template-standards" aria-label="Template standards"><article className="card"><span className="admin-template-standard-icon purple"><ShieldCheck size={16} /></span><div><strong>Client-safe by default</strong><p>Source status, freshness, and unavailable connections remain visible.</p></div></article><article className="card"><span className="admin-template-standard-icon teal"><BarChart3 size={16} /></span><div><strong>Built for real metrics</strong><p>Values and periods continue through the existing admin result editor.</p></div></article><article className="card"><span className="admin-template-standard-icon orange"><Target size={16} /></span><div><strong>Goals stay connected</strong><p>Targets and achievement highlights can be published with the report.</p></div></article></section>
    {activeTemplate && <section className="card admin-template-metric-preview"><div className="panel-heading"><div><p className="eyebrow">Metric coverage</p><h2>{activeTemplate.title} includes</h2></div><FileText size={18} color="#f26b38" /></div><div className="admin-template-metric-list">{activeConfig.metrics.map((metric) => <span key={metric}>{metric}</span>)}</div></section>}
  </div></AppShell>;
}
