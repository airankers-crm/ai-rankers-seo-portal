import { prisma } from "@ai-rankers/db";
import { AdminOperationsPage } from "../../../components/admin-operations";
import { getWorkspaceSettings } from "../../../lib/admin-settings";
import { requireAdminAccess } from "../../../lib/auth/access";

export const dynamic = "force-dynamic";

export default async function AdminSyncHealthPage() {
  await requireAdminAccess();
  const [settings, runs] = await Promise.all([
    getWorkspaceSettings(),
    prisma.integrationSyncRun.findMany({ orderBy: { startedAt: "desc" }, take: 50, include: { client: true, integration: true } }),
  ]);
  const rows = runs.map((run) => ({
    id: run.clientId,
    client: run.client.businessName,
    provider: "Google",
    mode: run.mode === "INITIAL_BACKFILL" ? "Initial backfill" : run.mode === "SCHEDULED" ? "Scheduled" : "Manual",
    status: run.status,
    freshness: run.completedAt?.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: settings.defaultTimezone }) ?? "Running",
    coverage: `${run.rowsWritten} written · ${run.rowsOverridden} overrides · ${run.rowsSkipped} skipped`,
    error: run.errorMessage ?? "—",
  }));

  return <AdminOperationsPage config={{
    activeNav: "Sync health",
    title: "Sync health",
    description: "Review Google sync attempts, freshness, coverage, overrides, and errors across client workspaces.",
    sourceLabel: "Google sync runs",
    sourceDescription: runs.length ? "Recent Google integration runs are loaded from the tenant-scoped database." : "No Google sync runs exist yet. Connect a client and start a provider sync to begin recording health data.",
    columns: [{ key: "client", label: "Client" }, { key: "provider", label: "Provider" }, { key: "mode", label: "Mode" }, { key: "status", label: "Status" }, { key: "freshness", label: "Completed" }, { key: "coverage", label: "Coverage" }, { key: "error", label: "Error" }],
    filters: [{ key: "status", label: "Status", options: ["RUNNING", "SUCCEEDED", "PARTIAL", "FAILED", "CANCELED"] }],
    rows,
    emptyTitle: "No sync runs to review",
    emptyDescription: "Connect a Google account from Integrations before running a sync.",
    primaryAction: { label: "Open integrations", href: "/admin/integrations" },
  }} />;
}
