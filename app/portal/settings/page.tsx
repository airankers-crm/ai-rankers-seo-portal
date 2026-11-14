import { prisma } from "@ai-rankers/db";
import { PortalSettings } from "../../../components/portal-settings";
import { requirePortalAccess } from "../../../lib/auth/access";

export const dynamic = "force-dynamic";

export default async function PortalSettingsPage() {
  const access = await requirePortalAccess();
  const client = await prisma.client.findUnique({
    where: access.user?.clientId ? { id: access.user.clientId } : { id: "__no_client__" },
      select: { businessName: true, brandMark: true, brandAccent: true, timezone: true, contactEmail: true, businessPhone: true, serviceArea: true, businessHours: true, websiteUrl: true, hasGbpSeo: true },
  });

  return (
    <PortalSettings
      clientName={client?.businessName ?? "Client workspace"}
      brandMark={client?.brandMark}
      brandAccent={client?.brandAccent}
      clientTimezone={client?.timezone ?? "America/New_York"}
      websiteUrl={client?.websiteUrl}
      contactEmail={client?.contactEmail}
      businessPhone={client?.businessPhone}
      serviceArea={client?.serviceArea}
      businessHours={client?.businessHours}
      hasGbpSeo={Boolean(client?.hasGbpSeo)}
      userName={access.user?.name ?? "Client user"}
      userEmail={access.user?.email ?? client?.contactEmail ?? ""}
      canEditProfile={Boolean(access.user && !access.preview)}
    />
  );
}
