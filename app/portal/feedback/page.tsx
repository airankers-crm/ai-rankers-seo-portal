import { prisma } from "@ai-rankers/db";
import { PortalFeedbackPage } from "../../../components/portal-feedback-page";
import { AppShell } from "../../../components/app-shell";
import { requirePortalAccess } from "../../../lib/auth/access";

export const dynamic = "force-dynamic";

export default async function FeedbackPage() {
  const access = await requirePortalAccess();
  const client = await prisma.client.findUnique({
    where: { id: access.user?.clientId ?? "__no_client__" },
    select: { businessName: true, brandMark: true, brandAccent: true },
  });
  const recentFeedback = access.user?.clientId ? await prisma.feedback.findMany({
    where: { clientId: access.user.clientId },
    select: { id: true, category: true, status: true, message: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 3,
  }) : [];
  const clientName = client?.businessName ?? "Client workspace";
  return <AppShell mode="portal" clientName={clientName} brandMark={client?.brandMark ?? undefined} brandAccent={client?.brandAccent ?? "#F26B38"} activeNav="Feedback">
    <div className="content portal-feedback-page">
      <div className="page-heading feedback-page-heading">
        <div>
          <p className="eyebrow">Client portal / Support</p>
          <h1>Feedback &amp; support</h1>
          <p>Send a question, request, or update directly to The AI Rankers team.</p>
        </div>
      </div>
      <PortalFeedbackPage recentRequests={recentFeedback.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() }))} />
    </div>
  </AppShell>;
}
