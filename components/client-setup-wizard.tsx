import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Circle } from "lucide-react";
import type { ReactNode } from "react";

export const CLIENT_SETUP_STEPS = [
  { id: "details", label: "Workspace details", shortLabel: "Details" },
  { id: "business", label: "Business profile", shortLabel: "Business" },
  { id: "website", label: "Website SEO", shortLabel: "Website" },
  { id: "gbp", label: "Google Business Profile", shortLabel: "GBP" },
  { id: "sections", label: "Portal sections", shortLabel: "Sections" },
  { id: "review", label: "Review & preview", shortLabel: "Review" },
  { id: "publish", label: "Publish portal", shortLabel: "Publish" },
  { id: "invite", label: "Invite client", shortLabel: "Invite" },
] as const;

export type ClientSetupStepId = (typeof CLIENT_SETUP_STEPS)[number]["id"];

export function getClientSetupStep(value?: string): ClientSetupStepId {
  return CLIENT_SETUP_STEPS.some((step) => step.id === value) ? value as ClientSetupStepId : "details";
}

export function ClientSetupWizard({ clientId, currentStep, children }: { clientId: string; currentStep: ClientSetupStepId; children: ReactNode }) {
  const currentIndex = CLIENT_SETUP_STEPS.findIndex((step) => step.id === currentStep);
  const previous = CLIENT_SETUP_STEPS[currentIndex - 1];
  const next = CLIENT_SETUP_STEPS[currentIndex + 1];
  const stepHref = (step: string) => `/admin/clients/${clientId}?step=${step}`;

  return <section className="client-setup-wizard" aria-label="Client setup wizard">
    <div className="client-setup-intro">
      <div>
        <p className="eyebrow">Guided client setup</p>
        <h2>{CLIENT_SETUP_STEPS[currentIndex].label}</h2>
        <p>Complete one focused step at a time. Save each section as a draft, then publish only after the client presentation is approved.</p>
      </div>
      <span className="setup-progress-label">Step {currentIndex + 1} of {CLIENT_SETUP_STEPS.length}</span>
    </div>
    <nav className="client-setup-stepper" aria-label="Client setup steps">
      {CLIENT_SETUP_STEPS.map((step, index) => {
        const isCurrent = step.id === currentStep;
        const isComplete = index < currentIndex;
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

export function ClientSourceChecklist({ source, description }: { source: "Website SEO" | "Google Business Profile"; description: string }) {
  return <aside className="setup-source-card" aria-label={`${source} setup guidance`}>
    <div className="setup-source-card-heading"><span className="setup-source-icon">✓</span><div><strong>{source}</strong><span>Connection checkpoint</span></div></div>
    <p>{description}</p>
    <div className="setup-checklist"><span><Check size={13} /> Correct client property selected</span><span><Check size={13} /> Data remains admin-only while in draft</span><span><Check size={13} /> Results will be reviewed before publishing</span></div>
  </aside>;
}

export function ClientReviewStep({ clientId, businessName, sectionCount, metricCount, draftSectionCount, draftMetricCount }: { clientId: string; businessName: string; sectionCount: number; metricCount: number; draftSectionCount: number; draftMetricCount: number }) {
  return <section className="card panel setup-review-card" aria-labelledby="setup-review-title">
    <div className="panel-heading"><div><p className="eyebrow">Final review</p><h2 id="setup-review-title">Review the client presentation</h2><p>Check the draft before release. Nothing on this page makes the portal visible to the client.</p></div><span className="setup-card-number">06</span></div>
    <div className="review-summary"><div><strong>{businessName}</strong><span>Client workspace</span></div><div><strong>{sectionCount}</strong><span>Portal sections</span></div><div><strong>{metricCount}</strong><span>Total metrics</span></div><div><strong>{draftSectionCount + draftMetricCount}</strong><span>Items still in draft</span></div></div>
    <div className="review-checklist"><div><Check size={15} /><span><strong>Website SEO preview</strong><small>Review the client-facing layout and approved search results.</small></span><Link className="button" href={`/admin/clients/${clientId}/preview/website-seo?mode=draft`} target="_blank">Preview</Link></div><div><Check size={15} /><span><strong>GBP performance preview</strong><small>Review the Google Search and Maps presentation.</small></span><Link className="button" href={`/admin/clients/${clientId}/preview/gbp?mode=draft`} target="_blank">Preview</Link></div><div><Check size={15} /><span><strong>Release safety</strong><small>The client sees published data only. Draft metrics and sections remain hidden.</small></span><span className="status progress">Draft-safe</span></div></div>
  </section>;
}
