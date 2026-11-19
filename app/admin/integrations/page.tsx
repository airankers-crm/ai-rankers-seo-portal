import { prisma } from "@ai-rankers/db";
import { GoogleIntegrationsAdmin } from "../../../components/google-integrations-admin";
import { getWorkspaceSettings } from "../../../lib/admin-settings";
import { requireAdminAccess } from "../../../lib/auth/access";

export const dynamic = "force-dynamic";

const errorMessages: Record<string, string> = {
  google_oauth_not_configured: "Google OAuth is not configured yet. Add the Google Cloud OAuth environment variables before connecting.",
  google_authorization_denied: "Google authorization was canceled.",
  google_callback_invalid: "The Google callback was incomplete.",
  google_callback_state_invalid: "The Google authorization state was invalid or expired.",
  google_callback_state_reused: "The Google authorization callback has already been used.",
  google_callback_failed: "Google connection failed. Review the integration error and try again.",
  auth_required: "Super Admin authentication is required.",
};

export default async function AdminIntegrationsPage({ searchParams }: { searchParams?: Promise<{ error?: string; connected?: string }> }) {
  await requireAdminAccess();
  const params = await searchParams;
  const [settings, clients] = await Promise.all([
    getWorkspaceSettings(),
    prisma.client.findMany({
      where: { status: { not: "ARCHIVED" } },
      orderBy: { businessName: "asc" },
      include: { googleIntegration: true },
    }),
  ]);

  return <GoogleIntegrationsAdmin
    queryMessage={params?.connected === "1" ? "Google account connected. Discover and select the client resources next." : params?.error ? errorMessages[params.error] ?? "The Google integration request could not be completed." : null}
    workspaceTimezone={settings.defaultTimezone}
    clients={clients.map((client) => ({
      id: client.id,
      businessName: client.businessName,
      status: client.googleIntegration?.status ?? "DISCONNECTED",
      googleAccountEmail: client.googleIntegration?.googleAccountEmail ?? null,
      ga4PropertyId: client.googleIntegration?.ga4PropertyId ?? null,
      gscSiteUrl: client.googleIntegration?.gscSiteUrl ?? null,
      gbpAccountId: client.googleIntegration?.gbpAccountId ?? null,
      gbpLocationId: client.googleIntegration?.gbpLocationId ?? null,
      lastSyncedAt: client.googleIntegration?.lastSyncedAt?.toISOString() ?? null,
      lastErrorMessage: client.googleIntegration?.lastErrorMessage ?? null,
    }))}
  />;
}
