"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, BarChart3, CheckCircle2, FileText, Globe2, MapPin, ShieldCheck, SlidersHorizontal, Sparkles, Target } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "./app-shell";

type TemplateFilter = "All" | "Website SEO" | "GBP performance";

type ReportTemplate = {
  id: "website-seo" | "gbp";
  category: Exclude<TemplateFilter, "All">;
  title: string;
  shortTitle: string;
  description: string;
  eyebrow: string;
  accent: "purple" | "teal";
  sectionCount: number;
  metricCount: number;
  sections: string[];
  metrics: string[];
  previewLabel: string;
  useLabel: string;
};

const templates: ReportTemplate[] = [
  {
    id: "website-seo",
    category: "Website SEO",
    title: "Website SEO performance",
    shortTitle: "Website SEO",
    description: "A clear search visibility report for organic growth, keyword movement, and landing-page performance.",
    eyebrow: "Search visibility",
    accent: "purple",
    sectionCount: 7,
    metricCount: 8,
    sections: ["Executive summary", "KPI scorecard", "Organic performance trend", "Search query detail", "Landing-page detail", "Goals and milestones", "Recommendations"],
    metrics: ["Organic sessions", "Search impressions", "Top-10 keywords", "Average position", "Clicks", "CTR", "Conversions", "Goal progress"],
    previewLabel: "Preview Website SEO",
    useLabel: "Use for Website SEO",
  },
  {
    id: "gbp",
    category: "GBP performance",
    title: "GBP performance report",
    shortTitle: "GBP performance",
    description: "A local visibility report for Search and Maps discovery, customer actions, and reputation activity.",
    eyebrow: "Local visibility",
    accent: "teal",
    sectionCount: 6,
    metricCount: 7,
    sections: ["Executive summary", "Discovery signals", "Customer actions", "Profile activity trend", "Results by period", "Reputation activity"],
    metrics: ["Search & Maps impressions", "Call clicks", "Website clicks", "Direction requests", "Reviews received", "Customer actions", "Goal progress"],
    previewLabel: "Preview GBP report",
    useLabel: "Use for GBP performance",
  },
];

function templateHref(template: ReportTemplate, clientId: string | undefined, action: "preview" | "use") {
  if (!clientId) return "/admin/clients";
  if (action === "preview") return `/admin/clients/${clientId}/preview/${template.id}`;
  return `/admin/clients/${clientId}?section=${template.id === "website-seo" ? "website" : "gbp"}#client-results-title`;
}

export function AdminReportTemplate({ clientId, clientName }: { clientId?: string; clientName?: string }) {
  const [filter, setFilter] = useState<TemplateFilter>("All");
  const [activeId, setActiveId] = useState<ReportTemplate["id"]>("website-seo");
  const visibleTemplates = useMemo(() => filter === "All" ? templates : templates.filter((template) => template.category === filter), [filter]);
  const activeTemplate = templates.find((template) => template.id === activeId) ?? templates[0];

  return <AppShell mode="admin">
    <div className="content admin-template-page">
      <div className="page-heading">
        <div><h1>Report templates</h1></div>
        <div className="heading-actions"><Link className="button" href="/admin/reports">Open report operations <ArrowUpRight size={14} /></Link></div>
      </div>

      <section className="card admin-template-intro">
        <div className="admin-template-intro-mark"><Sparkles size={18} /></div>
        <div><strong>Client-safe report library</strong><span>Choose a branded structure, review the client preview, and continue in the existing portal editor.</span></div>
        <span className="status complete"><CheckCircle2 size={12} /> {templates.length} ready templates</span>
      </section>

      <div className="admin-template-library">
        <section className="card admin-template-catalog" aria-labelledby="template-catalog-title">
          <div className="admin-template-catalog-head"><div><p className="eyebrow">Template library</p><h2 id="template-catalog-title">Choose a reporting structure</h2></div><SlidersHorizontal size={17} color="#6f3fb5" /></div>
          <div className="admin-template-filters" role="tablist" aria-label="Report template categories">{(["All", "Website SEO", "GBP performance"] as TemplateFilter[]).map((item) => <button key={item} className={filter === item ? "active" : ""} type="button" role="tab" aria-selected={filter === item} onClick={() => { setFilter(item); if (item !== "All") setActiveId(item === "Website SEO" ? "website-seo" : "gbp"); }}>{item}</button>)}</div>
          <div className="admin-template-grid">{visibleTemplates.map((template) => <button className={`admin-template-card${template.id === activeTemplate.id ? " active" : ""}`} type="button" key={template.id} onClick={() => setActiveId(template.id)} aria-pressed={template.id === activeTemplate.id}>
            <span className={`admin-template-card-icon ${template.accent}`}>{template.id === "website-seo" ? <Globe2 size={17} /> : <MapPin size={17} />}</span>
            <span className="admin-template-card-copy"><strong>{template.title}</strong><small>{template.description}</small></span>
            <span className="admin-template-card-meta"><span>{template.sectionCount} sections</span><span>{template.metricCount} metrics</span></span>
            <ArrowUpRight size={14} className="admin-template-card-arrow" />
          </button>)}</div>
        </section>

        <aside className={`card admin-template-detail ${activeTemplate.accent}`} aria-labelledby="template-detail-title">
          <div className="admin-template-detail-top"><span className="admin-template-detail-eyebrow">{activeTemplate.eyebrow}</span><span className="status complete">Ready</span></div>
          <div className="admin-template-detail-brand"><Image src="/branding/ai-rankers/brand_logo.png" alt="The AI Rankers" width={132} height={43} priority /></div>
          <h2 id="template-detail-title">{activeTemplate.title}</h2>
          <p>{activeTemplate.description}</p>
          <div className="admin-template-detail-stats"><div><strong>{activeTemplate.sectionCount}</strong><span>report sections</span></div><div><strong>{activeTemplate.metricCount}</strong><span>core metrics</span></div></div>
          <div className="admin-template-detail-list"><strong>Included in this template</strong>{activeTemplate.sections.map((section) => <span key={section}><CheckCircle2 size={13} />{section}</span>)}</div>
          <div className="admin-template-detail-actions"><Link className="button" href={templateHref(activeTemplate, clientId, "preview")}>{activeTemplate.previewLabel} <ArrowUpRight size={13} /></Link><Link className="button primary" href={templateHref(activeTemplate, clientId, "use")}>{activeTemplate.useLabel} <ArrowUpRight size={13} /></Link></div>
          <small className="admin-template-detail-note">{clientName ? `Next client: ${clientName}` : "Create a client workspace to apply a template."}</small>
        </aside>
      </div>

      <section className="admin-template-standards" aria-label="Template standards">
        <article className="card"><span className="admin-template-standard-icon purple"><ShieldCheck size={16} /></span><div><strong>Client-safe by default</strong><p>Source status, freshness, and unavailable connections remain visible.</p></div></article>
        <article className="card"><span className="admin-template-standard-icon teal"><BarChart3 size={16} /></span><div><strong>Built for real metrics</strong><p>Values and periods continue through the existing admin result editor.</p></div></article>
        <article className="card"><span className="admin-template-standard-icon orange"><Target size={16} /></span><div><strong>Goals stay connected</strong><p>Targets and achievement highlights can be published with the report.</p></div></article>
      </section>

      <section className="card admin-template-metric-preview"><div className="panel-heading"><div><p className="eyebrow">Metric coverage</p><h2>{activeTemplate.shortTitle} template includes</h2></div><FileText size={18} color="#f26b38" /></div><div className="admin-template-metric-list">{activeTemplate.metrics.map((metric) => <span key={metric}>{metric}</span>)}</div></section>
    </div>
  </AppShell>;
}
