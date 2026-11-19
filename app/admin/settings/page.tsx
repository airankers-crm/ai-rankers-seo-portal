import { AdminSettings } from "../../../components/admin-settings";
import type { AdminSettingsSource } from "../../../components/admin-settings";
import { prisma } from "@ai-rankers/db";
import { requireAdminAccess } from "../../../lib/auth/access";
import { getWorkspaceSettings } from "../../../lib/admin-settings";

export default async function AdminSettingsPage() {
  const access = await requireAdminAccess();
  if (access.preview) return <AdminSettings initialSettings={null} preview />;

  const [settings, integrations] = await Promise.all([
    getWorkspaceSettings(),
    prisma.googleIntegration.findMany({ select: { status: true, ga4PropertyId: true, gscSiteUrl: true, gbpLocationId: true } }),
  ]);
  const connected = (field: "ga4PropertyId" | "gscSiteUrl" | "gbpLocationId") => integrations.some((integration) => integration.status === "CONNECTED" && Boolean(integration[field]));
  const sources: AdminSettingsSource[] = [
    { id: "ga4", label: "GA4", detail: "Organic sessions", status: connected("ga4PropertyId") ? "Connected" : "Not connected", tone: connected("ga4PropertyId") ? "ready" : "review" },
    { id: "gsc", label: "GSC", detail: "Search visibility", status: connected("gscSiteUrl") ? "Connected" : "Not connected", tone: connected("gscSiteUrl") ? "ready" : "review" },
    { id: "gbp", label: "GBP", detail: "Local actions", status: connected("gbpLocationId") ? "Connected" : "Not connected", tone: connected("gbpLocationId") ? "ready" : "review" },
    { id: "dataforseo", label: "DataForSEO", detail: "Keyword rankings", status: "Not connected", tone: "review" },
  ];

  return <AdminSettings initialSettings={settings} sources={sources} />;
}
