import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, FileText, Globe2, Layers3, Mail, UsersRound } from "lucide-react";
import { prisma } from "@ai-rankers/db";
import { AppShell } from "../../../../components/app-shell";
import { ClientSettingsForm } from "../../../../components/client-settings-form";
import { ClientInvitationForm } from "../../../../components/client-invitation-form";
import { requireAdminAccess } from "../../../../lib/auth/access";

export const dynamic = "force-dynamic";

export default async function ClientWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminAccess();
  const { id } = await params;
  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      sections: { orderBy: { position: "asc" } },
      _count: { select: { users: true, metrics: true, reports: true, activities: true } },
    },
  });

  if (!client) notFound();

  return (
    <AppShell mode="admin">
      <div className="content">
        <div className="page-heading">
          <div>
            <Link className="back-link" href="/admin"><ArrowLeft size={13} /> Back to workspace overview</Link>
            <p className="eyebrow">Client workspace</p>
            <h1>{client.businessName}</h1>
            <p>Manage this client’s dashboard foundation, users, and reporting surface from one place.</p>
          </div>
          <span className="status complete">{client.status}</span>
        </div>

        <div className="admin-stat-grid">
          <article className="card admin-stat"><div className="admin-stat-label">Dashboard sections</div><div className="admin-stat-value">{client.sections.length}</div><div className="admin-stat-note">Ready for configuration</div></article>
          <article className="card admin-stat"><div className="admin-stat-label">Published metrics</div><div className="admin-stat-value">{client._count.metrics}</div><div className="admin-stat-note">Data source connections next</div></article>
          <article className="card admin-stat"><div className="admin-stat-label">Portal users</div><div className="admin-stat-value">{client._count.users}</div><div className="admin-stat-note">Invite client stakeholders</div></article>
        </div>

        <div className="dashboard-grid">
          <section className="card panel">
            <div className="panel-heading"><div><h2>SEO project configuration</h2><p>Choose the services and reporting details for this client.</p></div><Building2 size={18} color="#f26b38" /></div>
            <ClientSettingsForm client={{ id: client.id, brandMark: client.brandMark, brandAccent: client.brandAccent, websiteUrl: client.websiteUrl, contactEmail: client.contactEmail, timezone: client.timezone, hasWebsiteSeo: client.hasWebsiteSeo, hasGbpSeo: client.hasGbpSeo }} />
          </section>
          <section className="card panel">
            <div className="panel-heading"><div><h2>Invite workspace users</h2><p>Share access with the client team when the presentation is ready.</p></div><UsersRound size={18} color="#148f83" /></div>
            <ClientInvitationForm clientId={client.id} />
          </section>
        </div>

        <div className="dashboard-grid">
          <section className="card panel">
            <div className="panel-heading"><div><h2>Workspace details</h2><p>Identity and delivery settings</p></div><Building2 size={18} color="#f26b38" /></div>
            <div className="detail-list">
              <div className="detail-row"><Globe2 size={15} /><span>Website</span><strong>{client.websiteUrl || "Not added"}</strong></div>
              <div className="detail-row"><Mail size={15} /><span>Contact email</span><strong>{client.contactEmail || "Not added"}</strong></div>
              <div className="detail-row"><UsersRound size={15} /><span>Portal users</span><strong>{client._count.users}</strong></div>
              <div className="detail-row"><FileText size={15} /><span>Reports</span><strong>{client._count.reports}</strong></div>
            </div>
          </section>
          <section className="card panel">
            <div className="panel-heading"><div><h2>Dashboard sections</h2><p>Created with this workspace</p></div><Layers3 size={18} color="#148f83" /></div>
            <div className="mini-list">{client.sections.map((section) => <div className="list-row" key={section.id}><div className="list-icon"><Layers3 size={15} /></div><div className="list-body"><div className="list-title">{section.name}</div><div className="list-meta">{section.kind} · {section.isDraft ? "Draft" : "Published"}</div></div><span className={`status ${section.isDraft ? "progress" : "complete"}`}>{section.isDraft ? "Draft" : "Live"}</span></div>)}</div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
