"use client";

import { CheckCircle2, Eye, Layers3, Save } from "lucide-react";
import { useState } from "react";
import { defaultGbpPresentation, type GbpPresentationSettings } from "./gbp-performance-dashboard";

type PortalSection = {
  id: string;
  name: string;
  kind: string;
  position: number;
  isVisible: boolean;
  isDraft: boolean;
  presentation?: GbpPresentationSettings | null;
};

const sectionLabels: Record<string, string> = {
  WEBSITE: "Website SEO",
  GBP: "GBP performance",
  OVERVIEW: "Portal overview",
  CUSTOM: "Custom section",
};

export function ClientSectionEditor({ clientId, sections: initialSections }: { clientId: string; sections: PortalSection[] }) {
  const [sections, setSections] = useState(initialSections.filter((section) => section.kind === "WEBSITE" || section.kind === "GBP").map((section) => section.kind === "GBP" ? { ...section, presentation: section.presentation ? { ...defaultGbpPresentation, ...section.presentation } : { ...defaultGbpPresentation } } : section));
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function saveSection(section: PortalSection) {
    setPendingId(section.id);
    setMessage("");
    setError("");
    try {
      const response = await fetch(`/api/admin/clients/${clientId}/sections/${section.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(section),
      });
      const body = await response.json().catch(() => null) as { error?: string; section?: PortalSection } | null;
      if (!response.ok || !body?.section) {
        setError(body?.error ?? "The portal section could not be saved.");
        return;
      }
      setSections((current) => current.map((item) => item.id === section.id ? body.section! : item));
      setMessage(`${sectionLabels[section.kind] ?? "Portal section"} settings saved.`);
    } catch {
      setError("The portal section could not be saved. Check the connection and try again.");
    } finally {
      setPendingId(null);
    }
  }

  function updateSection(id: string, patch: Partial<PortalSection>) {
    setSections((current) => current.map((section) => section.id === id ? { ...section, ...patch } : section));
  }

  function updatePresentation(id: string, patch: Partial<GbpPresentationSettings>) {
    setSections((current) => current.map((section) => section.id === id && section.presentation ? { ...section, presentation: { ...section.presentation, ...patch } } : section));
  }

  return <section className="card panel client-section-editor" aria-labelledby="client-sections-title">
    <div className="panel-heading"><div><p className="eyebrow">Portal presentation</p><h2 id="client-sections-title">Published client sections</h2><p>Control the client-facing Website SEO and GBP page labels and publishing state.</p></div><Layers3 size={18} color="#6f3fb5" /></div>
    {message && <p className="save-status section-feedback" role="status"><CheckCircle2 size={14} /> {message}</p>}
    {error && <p className="auth-error section-feedback" role="alert">{error}</p>}
    <div className="client-section-list">{sections.map((section) => <article className="client-section-row" key={section.id}>
      <div className="client-section-row-heading"><div className="client-section-icon"><Layers3 size={15} /></div><div><strong>{sectionLabels[section.kind] ?? "Portal section"}</strong><span>{section.isDraft ? "Draft section" : "Published section"}</span></div><span className={`status ${section.isDraft ? "progress" : "complete"}`}>{section.isDraft ? "Draft" : "Live"}</span></div>
      <div className="client-section-controls"><label>Client-facing label<input value={section.name} maxLength={80} onChange={(event) => updateSection(section.id, { name: event.target.value })} /></label><label className="result-check"><input type="checkbox" checked={section.isVisible} onChange={(event) => updateSection(section.id, { isVisible: event.target.checked })} /><Eye size={13} /> Show in client portal</label><label className="result-publish-toggle section-publish-toggle"><input type="checkbox" checked={!section.isDraft} onChange={(event) => updateSection(section.id, { isDraft: !event.target.checked })} /><span><strong>{section.isDraft ? "Keep as draft" : "Published to client"}</strong><small>{section.isDraft ? "The page remains hidden until approved." : "The client can access this section."}</small></span></label>{section.kind === "GBP" && section.presentation ? <div className="gbp-presentation-editor"><div className="gbp-presentation-editor-heading"><strong>GBP screen content</strong><span>Control the labels and insight copy shown to the client.</span></div><div className="gbp-presentation-grid"><label>Page title<input value={section.presentation.pageTitle} maxLength={80} onChange={(event) => updatePresentation(section.id, { pageTitle: event.target.value })} /></label><label>Page subtitle<input value={section.presentation.pageSubtitle} maxLength={140} onChange={(event) => updatePresentation(section.id, { pageSubtitle: event.target.value })} /></label><label>Filter label<input value={section.presentation.filterLabel} maxLength={50} onChange={(event) => updatePresentation(section.id, { filterLabel: event.target.value })} /></label><label>Channel label<input value={section.presentation.channelLabel} maxLength={50} onChange={(event) => updatePresentation(section.id, { channelLabel: event.target.value })} /></label><label>Display label<input value={section.presentation.displayLabel} maxLength={50} onChange={(event) => updatePresentation(section.id, { displayLabel: event.target.value })} /></label><label>Chart title<input value={section.presentation.chartTitle} maxLength={100} onChange={(event) => updatePresentation(section.id, { chartTitle: event.target.value })} /></label><label>Insights title<input value={section.presentation.insightTitle} maxLength={80} onChange={(event) => updatePresentation(section.id, { insightTitle: event.target.value })} /></label><label>Insight one<textarea value={section.presentation.insightOne} maxLength={180} rows={2} onChange={(event) => updatePresentation(section.id, { insightOne: event.target.value })} /></label><label>Insight two<textarea value={section.presentation.insightTwo} maxLength={180} rows={2} onChange={(event) => updatePresentation(section.id, { insightTwo: event.target.value })} /></label><label>Insight source note<textarea value={section.presentation.insightSource} maxLength={180} rows={2} onChange={(event) => updatePresentation(section.id, { insightSource: event.target.value })} /></label></div></div> : null}<button className="button primary" type="button" onClick={() => void saveSection(section)} disabled={pendingId === section.id}><Save size={13} /> {pendingId === section.id ? "Saving…" : "Save section"}</button></div>
    </article>)}</div>
  </section>;
}
