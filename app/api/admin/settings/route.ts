import { NextResponse } from "next/server";
import { prisma } from "@ai-rankers/db";
import { requireAdminAccess } from "../../../../lib/auth/access";
import { DEFAULT_WORKSPACE_SETTINGS, getWorkspaceSettings, serializeWorkspaceSettings } from "../../../../lib/admin-settings";

export const dynamic = "force-dynamic";

const timezones = new Set([
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Australia/Sydney",
]);
const reportingWindows = new Set(["3m", "6m", "12m"]);
const portalVisibilities = new Set(["published", "approved"]);
const brandingModes = new Set(["default", "client"]);

type SettingsBody = Partial<{
  workspaceName: unknown;
  defaultTimezone: unknown;
  defaultReportingWindow: unknown;
  portalVisibility: unknown;
  brandingMode: unknown;
  notifyClientFeedback: unknown;
  notifyReportPublishing: unknown;
  notifySyncWarnings: unknown;
}>;

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asBoolean(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

function validateSettings(body: SettingsBody) {
  const workspaceName = text(body.workspaceName);
  if (workspaceName.length < 2 || workspaceName.length > 80) return { error: "Workspace name must be between 2 and 80 characters." };

  const defaultTimezone = text(body.defaultTimezone);
  if (!timezones.has(defaultTimezone)) return { error: "Choose a supported reporting timezone." };

  const defaultReportingWindow = text(body.defaultReportingWindow);
  if (!reportingWindows.has(defaultReportingWindow)) return { error: "Choose a valid default reporting window." };

  const portalVisibility = text(body.portalVisibility);
  if (!portalVisibilities.has(portalVisibility)) return { error: "Choose a valid client portal visibility rule." };

  const brandingMode = text(body.brandingMode);
  if (!brandingModes.has(brandingMode)) return { error: "Choose a valid branding mode." };

  const notifyClientFeedback = asBoolean(body.notifyClientFeedback);
  const notifyReportPublishing = asBoolean(body.notifyReportPublishing);
  const notifySyncWarnings = asBoolean(body.notifySyncWarnings);
  if (notifyClientFeedback === null || notifyReportPublishing === null || notifySyncWarnings === null) return { error: "Notification settings must be true or false." };

  return { value: { workspaceName, defaultTimezone, defaultReportingWindow, portalVisibility, brandingMode, notifyClientFeedback, notifyReportPublishing, notifySyncWarnings } };
}

export async function GET() {
  const access = await requireAdminAccess();
  if (access.preview || !access.user) return NextResponse.json({ settings: { ...DEFAULT_WORKSPACE_SETTINGS, updatedAt: new Date(0).toISOString() }, preview: true });
  return NextResponse.json({ settings: await getWorkspaceSettings(), preview: false });
}

export async function PATCH(request: Request) {
  const access = await requireAdminAccess();
  if (access.preview || !access.user) return NextResponse.json({ error: "Admin authentication is required to update workspace settings." }, { status: 401 });

  const body = await request.json().catch(() => null) as SettingsBody | null;
  const validated = validateSettings(body ?? {});
  if ("error" in validated) return NextResponse.json({ error: validated.error }, { status: 400 });

  const existing = await prisma.workspaceSettings.findUnique({ where: { id: DEFAULT_WORKSPACE_SETTINGS.id } });
  const saved = await prisma.$transaction(async (transaction) => {
    const settings = await transaction.workspaceSettings.upsert({
      where: { id: DEFAULT_WORKSPACE_SETTINGS.id },
      create: { id: DEFAULT_WORKSPACE_SETTINGS.id, ...validated.value },
      update: validated.value,
    });
    await transaction.auditLog.create({
      data: {
        actorId: access.user!.id,
        action: "WORKSPACE_SETTINGS_UPDATED",
        entityType: "WorkspaceSettings",
        entityId: settings.id,
        before: existing ? serializeWorkspaceSettings(existing) : undefined,
        after: serializeWorkspaceSettings(settings),
      },
    });
    return settings;
  });

  return NextResponse.json({ settings: serializeWorkspaceSettings(saved) });
}
