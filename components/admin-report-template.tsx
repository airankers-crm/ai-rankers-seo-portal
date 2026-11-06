import Link from "next/link";
import { ArrowUpRight, CheckCircle2, FileText, Layers3 } from "lucide-react";
import { AppShell } from "./app-shell";

const sections = [
  ["01", "Executive summary", "Status, measured changes, risks, and next actions"],
  ["02", "CRM coverage", "Lifecycle coverage and required connections"],
  ["03", "KPI scorecard", "Current values, comparison, sources, and definitions"],
  ["04", "Website SEO", "Organic sessions, impressions, and keyword coverage"],
  ["05", "Goals and milestones", "Targets, progress, and published milestones"],
  ["06", "Local SEO / GBP", "Profile performance and local visibility context"],
  ["07", "Work completed", "Client-visible delivery records and ownership"],
  ["08", "Recommendations", "Evidence-based actions, impact, and effort"],
  ["09", "Source coverage", "Freshness, methodology, and attribution limits"],
  ["10", "Appendix", "Supporting tables and provider coverage"],
];

export function AdminReportTemplate() {
  return <AppShell mode="admin">
    <div className="content admin-template-page">
      <div className="page-heading">
        <div><p className="eyebrow">The AI Rankers / Templates</p><h1>Client report template</h1><p>Reusable structure for polished, client-safe SEO performance reports.</p></div>
        <div className="heading-actions"><Link className="button" href="/admin/reports">Open report operations <ArrowUpRight size={14} /></Link></div>
      </div>

      <section className="card admin-template-banner"><div className="admin-template-banner-icon"><Layers3 size={18} /></div><div><p className="eyebrow">Template foundation</p><h2>SEO performance report</h2><p>The same report structure used by the client report view, presented here for internal review before publishing.</p></div><span className="status complete"><CheckCircle2 size={12} /> Ready for review</span></section>

      <div className="admin-template-preview">
        <section className="card admin-template-preview-card" aria-labelledby="admin-template-preview-title">
          <div className="admin-template-cover">
            <div className="admin-template-cover-logo"><FileText size={16} /> The AI Rankers</div>
            <div className="admin-template-cover-copy"><p>SEO · local visibility · execution</p><h2 id="admin-template-preview-title">SEO Performance Report</h2><span>Prepared for a client workspace</span></div>
            <div className="admin-template-cover-meta"><span>Website SEO</span><span>Local SEO / GBP</span><span>Source coverage included</span></div>
          </div>
          <div className="admin-template-preview-foot"><div><strong>Client-safe presentation</strong><span>Report status, source freshness, and limitations remain visible.</span></div><Link className="button primary" href="/portal/reports">Open client report center <ArrowUpRight size={14} /></Link></div>
        </section>

        <aside className="card admin-template-outline" aria-labelledby="admin-template-outline-title">
          <div className="panel-heading"><div><p className="eyebrow">Template outline</p><h2 id="admin-template-outline-title">Report sections</h2></div><FileText size={18} color="#f26b38" /></div>
          <div className="admin-template-section-list">{sections.map(([number, title, description]) => <div className="admin-template-section" key={number}><span>{number}</span><div><strong>{title}</strong><small>{description}</small></div></div>)}</div>
        </aside>
      </div>
    </div>
  </AppShell>;
}
