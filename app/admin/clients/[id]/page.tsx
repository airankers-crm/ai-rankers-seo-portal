import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, Clock3, FileText, Globe2, Mail, MapPin, Phone, UsersRound } from "lucide-react";
import { prisma } from "@ai-rankers/db";
import { AppShell } from "../../../../components/app-shell";
import { ClientSettingsForm } from "../../../../components/client-settings-form";
import { ClientInvitationForm } from "../../../../components/client-invitation-form";
import { ClientResultsEditor } from "../../../../components/client-results-editor";
import { CsvImportPanel } from "../../../../components/csv-import-panel";
import { ClientSectionEditor } from "../../../../components/client-section-editor";
import { ClientPublishControls } from "../../../../components/client-publish-controls";
import { ClientDataSourceToggle } from "../../../../components/client-data-source-toggle";
import { ClientBusinessProfileStep, ClientReviewStep, ClientSetupWizard, ClientSourceChecklist, ClientSourceToolbar, getClientSetupStep } from "../../../../components/client-setup-wizard";
import { requireAdminAccess } from "../../../../lib/auth/access";
import { provisionGoogleMetrics, provisionWebsiteGscMetrics } from "../../../../lib/google/provision";

export const dynamic = "force-dynamic";

export default async function ClientWorkspacePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams?: Promise<{ step?: string; section?: string }> }) {
  const access = await requireAdminAccess();
  const { id } = await params;
  const query = await searchParams;
  const currentStep = getClientSetupStep(query?.step ?? (query?.section === "website" ? "website" : query?.section === "analytics" ? "analytics" : query?.section === "gbp" ? "gbp" : undefined));
  if (currentStep === "website" || currentStep === "analytics" || currentStep === "gbp") {
    const clientExists = await prisma.client.findUnique({ where: { id }, select: { id: true } });
    if (!clientExists) notFound();
    await provisionGoogleMetrics(id);
    if (currentStep === "website") await provisionWebsiteGscMetrics(id);
  }
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      sections: { include: { presentation: true }, orderBy: { position: "asc" } },
      metrics: {
        select: {
          id: true,
          key: true,
          name: true,
          description: true,
          sectionId: true,
          displayType: true,
          valueFormat: true,
          source: true,
          higherIsBetter: true,
          isVisible: true,
          isDraft: true,
          section: { select: { name: true, kind: true } },
          values: { where: { dataOrigin: "MANAGED" }, orderBy: { periodStart: "desc" }, take: 6 },
        },
        orderBy: { position: "asc" },
      },
      goals: { include: { metric: { select: { name: true } } }, orderBy: { endDate: "asc" } },
      versions: { orderBy: { version: "desc" }, take: 10, select: { id: true, version: true, label: true, publishedAt: true } },
      _count: { select: { users: true, metrics: true, reports: true, activities: true } },
      googleIntegration: { select: { status: true, lastSyncedAt: true } },
    },
  });

  if (!client) notFound();

  const canImportCsv = access.user?.role === "SUPER_ADMIN" || access.user?.role === "ADMIN";
  const editorSections = client.sections.map((section) => ({ id: section.id, name: section.name, kind: section.kind }));
  const editorMetrics = client.metrics.map((metric) => ({
    id: metric.id,
    key: metric.key,
    name: metric.name,
    description: metric.description,
    sectionId: metric.sectionId,
    sectionKind: metric.section.kind,
    sectionName: metric.section.name,
    displayType: metric.displayType,
    valueFormat: metric.valueFormat,
    source: metric.source,
    higherIsBetter: metric.higherIsBetter,
    isVisible: metric.isVisible,
    isDraft: metric.isDraft,
    values: metric.values.map((value) => ({
      id: value.id,
      periodStart: value.periodStart.toISOString(),
      periodEnd: value.periodEnd.toISOString(),
      value: value.value.toString(),
      source: value.source,
      note: value.note,
      isOverride: value.isOverride,
    })),
  }));
  const sourceToggleProps = { clientId: client.id, initialMode: client.dataMode, googleStatus: client.googleIntegration?.status ?? "DISCONNECTED", lastSyncedAt: client.googleIntegration?.lastSyncedAt?.toISOString() ?? null };

  const stepContent = currentStep === "details" ? <>
    <div className="dashboard-grid setup-first-grid">
      <section className="card panel" id="client-settings">
        <div className="panel-heading"><div><p className="eyebrow">Step 1</p><h2>Workspace details</h2><p>Set the identity, phone, service area, hours, website, contact, timezone, and services for this client workspace.</p></div><Building2 size={18} color="#f26b38" /></div>
        <ClientSettingsForm client={{ id: client.id, brandMark: client.brandMark, brandAccent: client.brandAccent, websiteUrl: client.websiteUrl, contactEmail: client.contactEmail, businessPhone: client.businessPhone, serviceArea: client.serviceArea, businessHours: client.businessHours, timezone: client.timezone, hasWebsiteSeo: client.hasWebsiteSeo, hasGbpSeo: client.hasGbpSeo }} />
      </section>
      <section className="card panel setup-side-card"><div className="panel-heading"><div><h2>Setup at a glance</h2><p>Keep this workspace in draft while sources are connected.</p></div></div><div className="detail-list"><div className="detail-row"><Globe2 size={15} /><span>Website</span><strong>{client.websiteUrl || "Not added"}</strong></div><div className="detail-row"><Phone size={15} /><span>Phone</span><strong>{client.businessPhone || "Not added"}</strong></div><div className="detail-row"><MapPin size={15} /><span>Service area</span><strong>{client.serviceArea || "Not added"}</strong></div><div className="detail-row"><Clock3 size={15} /><span>Hours</span><strong>{client.businessHours || "Not added"}</strong></div><div className="detail-row"><Mail size={15} /><span>Contact email</span><strong>{client.contactEmail || "Not added"}</strong></div><div className="detail-row"><UsersRound size={15} /><span>Portal users</span><strong>{client._count.users}</strong></div><div className="detail-row"><FileText size={15} /><span>Reports</span><strong>{client._count.reports}</strong></div></div></section>
      <ClientDataSourceToggle {...sourceToggleProps} />
    </div>
  </> : currentStep === "business" ? <ClientBusinessProfileStep businessName={client.businessName} websiteUrl={client.websiteUrl} /> : currentStep === "website" ? <div className="setup-source-layout">
    {canImportCsv && <ClientSourceToolbar clientId={client.id} screen="website" />}
    <ClientDataSourceToggle {...sourceToggleProps} screenLabel="Website GSC" />
    <ClientSourceChecklist source="Website SEO" description="Prepare verified website-search results for the client. Connect or record approved values in the editor, then leave them as drafts until the review step." />
    <ClientResultsEditor clientId={client.id} initialView="website" showTabs={false} sections={editorSections} metrics={editorMetrics} />
    {canImportCsv && <CsvImportPanel clientId={client.id} screen="website" />}
  </div> : currentStep === "analytics" ? <div className="setup-source-layout">
    {canImportCsv && <ClientSourceToolbar clientId={client.id} screen="analytics" />}
    <ClientDataSourceToggle {...sourceToggleProps} screenLabel="Analytics" />
    <ClientSourceChecklist source="Analytics" description="Prepare approved Google Analytics results for the client. Edit each card independently and keep imported values in draft until the analytics presentation is approved." />
    <ClientResultsEditor clientId={client.id} initialView="analytics" showTabs={false} sections={editorSections} metrics={editorMetrics} />
    {canImportCsv && <CsvImportPanel clientId={client.id} screen="analytics" />}
  </div> : currentStep === "gbp" ? <div className="setup-source-layout">
    {canImportCsv && <ClientSourceToolbar clientId={client.id} screen="gbp" />}
    <ClientDataSourceToggle {...sourceToggleProps} screenLabel="GBP performance" />
    <ClientSourceChecklist source="Google Business Profile" description="Prepare verified Search and Maps results for the client. Review the source and reporting period before anything is included in a published portal version." />
    <ClientResultsEditor clientId={client.id} initialView="gbp" showTabs={false} sections={editorSections} metrics={editorMetrics} />
    {canImportCsv && <CsvImportPanel clientId={client.id} screen="gbp" />}
  </div> : currentStep === "sections" ? <ClientSectionEditor clientId={client.id} sections={client.sections.map((section) => ({ id: section.id, name: section.name, kind: section.kind, position: section.position, isVisible: section.isVisible, isDraft: section.isDraft, presentation: section.presentation }))} /> : currentStep === "review" ? <ClientReviewStep clientId={client.id} businessName={client.businessName} sectionCount={client.sections.length} metricCount={client.metrics.length} draftSectionCount={client.sections.filter((section) => section.isDraft).length} draftMetricCount={client.metrics.filter((metric) => metric.isDraft).length} /> : currentStep === "publish" ? <ClientPublishControls clientId={client.id} versions={client.versions.map((version) => ({ id: version.id, version: version.version, label: version.label, publishedAt: version.publishedAt.toISOString() }))} draftMetricCount={client.metrics.filter((metric) => metric.isDraft).length} draftSectionCount={client.sections.filter((section) => section.isDraft).length} /> : <section className="card panel setup-invite-card"><div className="panel-heading"><div><p className="eyebrow">Step 9</p><h2>Invite the client</h2><p>Only invite the real customer email after the portal has been reviewed and published.</p></div><UsersRound size={18} color="#148f83" /></div><ClientInvitationForm clientId={client.id} /></section>;

  return (
    <AppShell mode="admin">
      <div className="content">
        <div className="page-heading">
          <div>
            <Link className="back-link" href="/admin"><ArrowLeft size={13} /> Back to workspace overview</Link>
            <p className="eyebrow">Client workspace</p>
            <h1>{client.businessName}</h1>
            <p>Set up this client workspace one step at a time, review the presentation, then publish only approved changes.</p>
          </div>
          <span className="status complete">{client.status}</span>
        </div>

        <ClientSetupWizard clientId={client.id} currentStep={currentStep}>{stepContent}</ClientSetupWizard>
      </div>
    </AppShell>
  );
}
