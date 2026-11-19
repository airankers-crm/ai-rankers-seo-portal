import { prisma } from "@ai-rankers/db";
import { AdminOperationsPage } from "../../../components/admin-operations";
import { requireAdminAccess } from "../../../lib/auth/access";
import { getWorkspaceSettings } from "../../../lib/admin-settings";

function formatAction(action: string) {
  return action.replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

function getScope(entityType: string, action: string) {
  if (entityType === "WorkspaceSettings") return "Workspace";
  if (entityType === "GoogleIntegration") return "Integration";
  if (entityType === "Report" || entityType === "DashboardVersion") return "Report";
  if (entityType === "User" || action.includes("INVITATION")) return "Access";
  if (["Goal", "GoalAnnotation", "Task", "Activity"].includes(entityType)) return "CRM";
  return "Client";
}

export default async function AdminAuditPage() {
  const access = await requireAdminAccess();
  if (access.preview) {
    return <AdminOperationsPage config={{ activeNav: "Audit activity", title: "Audit activity", description: "Review access changes, report publishing, client settings, and CRM transitions with actor and timestamp context.", sourceLabel: "Audit log boundary", sourceDescription: "Preview mode has no live audit records.", columns: [{ key: "event", label: "Event" }, { key: "actor", label: "Actor" }, { key: "scope", label: "Scope" }, { key: "time", label: "Time" }], filters: [{ key: "scope", label: "Scope", options: ["Workspace", "Client", "Report", "Integration", "CRM", "Access"] }], emptyTitle: "No audit events in preview", emptyDescription: "Connect admin authentication to review live audit events.", primaryAction: { label: "Open users & access", href: "/admin/users" } }} />;
  }

  const [settings, logs] = await Promise.all([
    getWorkspaceSettings(),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { actor: { select: { name: true, email: true } }, client: { select: { businessName: true } } } }),
  ]);
  const rows = logs.map((log) => ({
    id: log.id,
    event: formatAction(log.action),
    actor: log.actor.name || log.actor.email,
    scope: getScope(log.entityType, log.action),
    time: log.createdAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: settings.defaultTimezone }),
  }));

  return <AdminOperationsPage config={{ activeNav: "Audit activity", title: "Audit activity", description: "Review access changes, report publishing, client settings, and CRM transitions with actor and timestamp context.", sourceLabel: "Live audit records", sourceDescription: "Recent admin actions are loaded from the tenant-aware audit log, including workspace settings changes.", columns: [{ key: "event", label: "Event" }, { key: "actor", label: "Actor" }, { key: "scope", label: "Scope" }, { key: "time", label: "Time" }], rows, filters: [{ key: "scope", label: "Scope", options: ["Workspace", "Client", "Report", "Integration", "CRM", "Access"] }], emptyTitle: "No audit events in this view", emptyDescription: "Events will appear as users change access, publish reports, connect sources, or transition CRM records.", primaryAction: { label: "Open users & access", href: "/admin/users" } }} />;
}
