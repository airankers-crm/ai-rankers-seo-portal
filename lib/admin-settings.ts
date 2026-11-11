import { prisma } from "@ai-rankers/db";

export const DEFAULT_WORKSPACE_SETTINGS = {
  id: "default",
  workspaceName: "The AI Rankers",
  defaultTimezone: "America/Los_Angeles",
  defaultReportingWindow: "6m",
  portalVisibility: "published",
  brandingMode: "default",
  notifyClientFeedback: true,
  notifyReportPublishing: true,
  notifySyncWarnings: false,
} as const;

export type WorkspaceSettingsValue = {
  id: string;
  workspaceName: string;
  defaultTimezone: string;
  defaultReportingWindow: string;
  portalVisibility: string;
  brandingMode: string;
  notifyClientFeedback: boolean;
  notifyReportPublishing: boolean;
  notifySyncWarnings: boolean;
  updatedAt: string;
};

export async function getWorkspaceSettings() {
  const settings = await prisma.workspaceSettings.upsert({
    where: { id: DEFAULT_WORKSPACE_SETTINGS.id },
    create: DEFAULT_WORKSPACE_SETTINGS,
    update: {},
  });

  return serializeWorkspaceSettings(settings);
}

export function serializeWorkspaceSettings(settings: {
  id: string;
  workspaceName: string;
  defaultTimezone: string;
  defaultReportingWindow: string;
  portalVisibility: string;
  brandingMode: string;
  notifyClientFeedback: boolean;
  notifyReportPublishing: boolean;
  notifySyncWarnings: boolean;
  updatedAt: Date;
}): WorkspaceSettingsValue {
  return {
    id: settings.id,
    workspaceName: settings.workspaceName,
    defaultTimezone: settings.defaultTimezone,
    defaultReportingWindow: settings.defaultReportingWindow,
    portalVisibility: settings.portalVisibility,
    brandingMode: settings.brandingMode,
    notifyClientFeedback: settings.notifyClientFeedback,
    notifyReportPublishing: settings.notifyReportPublishing,
    notifySyncWarnings: settings.notifySyncWarnings,
    updatedAt: settings.updatedAt.toISOString(),
  };
}
