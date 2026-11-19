import { prisma } from "@ai-rankers/db";
import { AnalyticsPagesDetails } from "../../../../components/analytics-pages-details";
import { requirePortalService } from "../../../../lib/auth/access";

export const dynamic = "force-dynamic";

export default async function AnalyticsPagesPage() {
  const access = await requirePortalService("analytics");
  const client = await prisma.client.findUnique({ where: { id: access.user?.clientId ?? "__no_client__" }, select: { businessName: true, brandMark: true, brandAccent: true } });
  const clientName = client?.businessName ?? "Client workspace";
  const brandMark = client?.brandMark ?? clientName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  return <AnalyticsPagesDetails clientName={clientName} brandMark={brandMark} brandAccent={client?.brandAccent ?? "#F26B38"} rows={[]} />;
}
