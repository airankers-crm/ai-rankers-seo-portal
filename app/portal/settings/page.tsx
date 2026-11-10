import { prisma } from "@ai-rankers/db";
import { PortalSettings } from "../../../components/portal-settings";
import { requirePortalAccess } from "../../../lib/auth/access";

export const dynamic = "force-dynamic";

export default async function PortalSettingsPage() {
  const access = await requirePortalAccess();
  const client = await prisma.client.findUnique({
    where: access.user?.clientId ? { id: access.user.clientId } : { slug: "tony-roofing" },
      select: { businessName: true, brandMark: true, brandAccent: true, timezone: true, contactEmail: true },
  });

  return (
    <PortalSettings
      clientName={client?.businessName ?? "Client workspace"}
      brandMark={client?.brandMark}
      brandAccent={client?.brandAccent}
      clientTimezone={client?.timezone ?? "America/New_York"}
      userName={access.user?.name ?? "Client user"}
      userEmail={access.user?.email ?? client?.contactEmail ?? ""}
      canEditProfile={Boolean(access.user && !access.preview)}
    />
  );
}
