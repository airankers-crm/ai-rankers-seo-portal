import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Circle, Download, FileSpreadsheet } from "lucide-react";
import type { ReactNode } from "react";

export const CLIENT_SETUP_STEPS = [
  { id: "details", label: "Workspace details", shortLabel: "Details" },
  { id: "business", label: "Business profile", shortLabel: "Business" },
  { id: "website", label: "Website GSC", shortLabel: "Website GSC" },
  { id: "sections", label: "Portal sections", shortLabel: "Sections" },
  { id: "review", label: "Review & preview", shortLabel: "Review" },
  { id: "publish", label: "Publish portal", shortLabel: "Publish" },
  { id: "invite", label: "Invite client", shortLabel: "Invite" },
] as const;

// These remain valid direct source-screen routes from Manage portal, but are
// intentionally not part of the guided setup stepper.
const HIDDEN_SOURCE_STEPS = [
  { id: "analytics", label: "Analytics", shortLabel: "Analytics" },
  { id: "gbp", label: "Google Business Profile", shortLabel: "GBP" },
] as const;

const ROUTABLE_CLIENT_STEPS = [...CLIENT_SETUP_STEPS, ...HIDDEN_SOURCE_STEPS] as const;

export type ClientSetupStepId = (typeof ROUTABLE_CLIENT_STEPS)[number]["id"];

export function getClientSetupStep(value?: string): ClientSetupStepId {
  return ROUTABLE_CLIENT_STEPS.some((step) => step.id === value) ? value as ClientSetupStepId : "details";
}

export function ClientSetupWizard({ clientId, currentStep, children }: { clientId: string; currentStep: ClientSetupStepId; children: ReactNode }) {
  const currentStepDefinition = ROUTABLE_CLIENT_STEPS.find((step) => step.id === currentStep) ?? CLIENT_SETUP_STEPS[0];
  const isHiddenSourceStep = HIDDEN_SOURCE_STEPS.some((step) => step.id === currentStep);
  const currentIndex = isHiddenSourceStep ? CLIENT_SETUP_STEPS.findIndex((step) => step.id === "website") : CLIENT_SETUP_STEPS.findIndex((step) => step.id === currentStep);
  const previous = isHiddenSourceStep ? CLIENT_SETUP_STEPS[currentIndex] : CLIENT_SETUP_STEPS[currentIndex - 1];
  const next = CLIENT_SETUP_STEPS[currentIndex + 1];
  const stepHref = (step: string) => `/admin/clients/${clientId}?step=${step}`;

  return <section className="client-setup-wizard" aria-label="Client setup wizard">
    <div className="client-setup-intro">
      <div>
        <p className="eyebrow">Guided client setup</p>
        <h2>{currentStepDefinition.label}</h2>
        <p>Complete one focused step at a time. Save each section as a draft, then publish only after the client presentation is approved.</p>
      </div>
      <span className="setup-progress-label">{isHiddenSourceStep ? "Source screen" : `Step ${currentIndex + 1} of ${CLIENT_SETUP_STEPS.length}`}</span>
    </div>
    <nav className="client-setup-stepper" aria-label="Client setup steps">
      {CLIENT_SETUP_STEPS.map((step, index) => {
        const isCurrent = step.id === currentStep;
        const isComplete = index < currentIndex || (isHiddenSourceStep && index === currentIndex);
        return <span className={isCurrent ? "current" : isComplete ? "complete" : "upcoming"} key={step.id}>
          <Link href={stepHref(step.id)} aria-current={isCurrent ? "step" : undefined}>
            {isComplete ? <Check size={13} /> : <Circle size={13} />}
            <span className="step-label-full">{step.label}</span>
            <span className="step-label-short">{step.shortLabel}</span>
          </Link>
          {index < CLIENT_SETUP_STEPS.length - 1 && <i aria-hidden="true" />}
        </span>;
      })}
    </nav>
    <div className="client-setup-content">{children}</div>
    <div className="client-setup-navigation">
      {previous ? <Link className="button" href={stepHref(previous.id)}><ArrowLeft size={14} /> Back</Link> : <Link className="button" href="/admin/clients"><ArrowLeft size={14} /> All clients</Link>}
      <span className="setup-save-note">Changes stay in draft until you save or publish them.</span>
      {next ? <Link className="button primary" href={stepHref(next.id)}>Next: {next.shortLabel} <ArrowRight size={14} /></Link> : <Link className="button primary" href="/admin/clients">Finish setup <Check size={14} /></Link>}
    </div>
  </section>;
}

export function ClientBusinessProfileStep({ businessName, websiteUrl }: { businessName: string; websiteUrl: string | null }) {
  return <section className="card panel setup-detail-card" aria-labelledby="business-profile-title">
    <div className="panel-heading"><div><p className="eyebrow">Client context</p><h2 id="business-profile-title">Confirm the business profile</h2><p>Use this checkpoint to make sure the client-facing workspace is tied to the right business before connecting reporting sources.</p></div><span className="setup-card-number">02</span></div>
    <div className="business-profile-grid">
      <div><span>Business name</span><strong>{businessName}</strong></div>
      <div><span>Website</span><strong>{websiteUrl || "Add the website in Workspace details"}</strong></div>
      <div><span>Profile status</span><strong>Ready for source connections</strong></div>
      <div><span>Client visibility</span><strong>Admin draft only</strong></div>
    </div>
    <div className="setup-guidance"><strong>What happens here</strong><p>Confirm the business identity first. Location, phone, services, and customer contact details should come from the client or a verified business source before they are published to a client portal.</p></div>
  </section>;
}

export function ClientSourceChecklist({ source, description }: { source: "Website SEO" | "Website GSC" | "Analytics" | "Google Business Profile"; description: string }) {
  const displaySource = source === "Website SEO" ? "Website GSC" : source;
  return <aside className="setup-source-card" aria-label={`${displaySource} setup guidance`}>
    <div className="setup-source-card-heading"><span className="setup-source-icon">✓</span><div><strong>{displaySource}</strong><span>Connection checkpoint</span></div></div>
    <p>{description}</p>
    <div className="setup-checklist"><span><Check size={13} /> Correct client property selected</span><span><Check size={13} /> Data remains admin-only while in draft</span><span><Check size={13} /> Results will be reviewed before publishing</span></div>
  </aside>;
}

export function ClientSourceToolbar({ clientId, screen }: { clientId: string; screen: "website" | "analytics" | "gbp" }) {
  return <div className="source-screen-toolbar">
    <div><p className="eyebrow">Admin tools</p><strong>{screen === "website" ? "Website SEO" : screen === "analytics" ? "Analytics" : "GBP performance"} data controls</strong><span>Download the matching workbook or import approved manual values for this screen.</span></div>
    <div className="source-screen-actions"><a className="button" href={`/api/admin/clients/${clientId}/import-csv/template?screen=${screen}&include_previous=1&format=xlsx`} download><Download size={14} /> Download template</a><a className="button primary" href="#csv-import"><FileSpreadsheet size={14} /> Import Excel</a></div>
  </div>;
}

export function ClientReviewStep({ clientId, businessName, sectionCount, metricCount, draftSectionCount, draftMetricCount }: { clientId: string; businessName: string; sectionCount: number; metricCount: number; draftSectionCount: number; draftMetricCount: number }) {
  return <section className="card panel setup-review-card" aria-labelledby="setup-review-title">
    <div className="panel-heading"><div><p className="eyebrow">Final review</p><h2 id="setup-review-title">Review the client presentation</h2><p>Check the draft before release. Nothing on this page makes the portal visible to the client.</p></div><span className="setup-card-number">05</span></div>
    <div className="review-summary"><div><strong>{businessName}</strong><span>Client workspace</span></div><div><strong>{sectionCount}</strong><span>Portal sections</span></div><div><strong>{metricCount}</strong><span>Total metrics</span></div><div><strong>{draftSectionCount + draftMetricCount}</strong><span>Items still in draft</span></div></div>
    <div className="review-checklist"><div><Check size={15} /><span><strong>Website GSC preview</strong><small>Review the client-facing layout and approved Search Console results.</small></span><Link className="button" href={`/admin/clients/${clientId}/preview/website-seo?mode=draft`} target="_blank">Preview</Link></div><div><Check size={15} /><span><strong>Analytics preview</strong><small>Review the client-facing Google Analytics cards and trends.</small></span><Link className="button" href="/portal/analytics" target="_blank">Preview</Link></div><div><Check size={15} /><span><strong>GBP performance preview</strong><small>Review the Google Search and Maps presentation.</small></span><Link className="button" href={`/admin/clients/${clientId}/preview/gbp?mode=draft`} target="_blank">Preview</Link></div><div><Check size={15} /><span><strong>Release safety</strong><small>The client sees published data only. Draft metrics and sections remain hidden.</small></span><span className="status progress">Draft-safe</span></div></div>
  </section>;
}
