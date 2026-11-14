import { prisma } from "@ai-rankers/db";
import { PortalFeedback } from "../../../components/portal-feedback";
import { AppShell } from "../../../components/app-shell";
import { requirePortalAccess } from "../../../lib/auth/access";

export const dynamic = "force-dynamic";

export default async function FeedbackPage() {
  const access = await requirePortalAccess();
  const client = await prisma.client.findUnique({
    where: { id: access.user?.clientId ?? "__no_client__" },
    select: { businessName: true, brandMark: true, brandAccent: true },
  });
  const clientName = client?.businessName ?? "Client workspace";
  return <AppShell mode="portal" clientName={clientName} brandMark={client?.brandMark ?? undefined} brandAccent={client?.brandAccent ?? "#F26B38"} activeNav="Feedback">
    <div className="content portal-feedback-page">
      <div className="page-heading"><div><p className="eyebrow">Client portal / Support</p><h1>Feedback</h1><p>Send a question, issue, request, or note directly to the AI Rankers team.</p></div></div>
      <PortalFeedback pagePath="/portal/feedback" pageLabel="Client feedback" context={{ source: "Feedback page" }} />
    </div>
  </AppShell>;
}
