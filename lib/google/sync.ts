import { randomUUID } from "node:crypto";
import { prisma } from "@ai-rankers/db";
import { Prisma } from "@prisma/client";
import { provisionGoogleMetrics } from "./provision";
import { fetchGa4Metrics, fetchGbpMetrics, fetchGscMetrics, getGoogleSyncWindow, type GoogleMetricPoint, type GoogleProviderResult } from "./reporting";
import { GoogleOAuthError } from "./oauth";
import { getGoogleAccessToken } from "./tokens";

export type GoogleSyncMode = "INITIAL_BACKFILL" | "MANUAL" | "SCHEDULED";

type ProviderRun = {
  name: "GA4" | "GSC" | "GBP";
  configured: boolean;
  result?: GoogleProviderResult;
  error?: { code: string; message: string };
};

type SyncSummary = {
  clientId: string;
  status: "SUCCEEDED" | "PARTIAL" | "FAILED";
  rowsFetched: number;
  rowsWritten: number;
  rowsSkipped: number;
  rowsOverridden: number;
  warningCount: number;
  warnings: string[];
  errorCode?: string;
};

function safeError(error: unknown) {
  if (error instanceof GoogleOAuthError) return { code: error.code, message: error.message };
  if (error && typeof error === "object" && "code" in error && typeof error.code === "string" && /^P\d{4}$/.test(error.code)) {
    return { code: `PRISMA_${error.code}`, message: "Google data could not be saved to the reporting database." };
  }
  if (error instanceof Error) {
    const cause = error.cause && typeof error.cause === "object" ? error.cause as { code?: unknown; name?: unknown } : null;
    const causeCode = typeof cause?.code === "string" ? cause.code : typeof cause?.name === "string" ? cause.name : error.name;
    const normalizedCode = causeCode.toUpperCase().replace(/[^A-Z0-9_]+/g, "_").slice(0, 48) || "ERROR";
    return { code: `GOOGLE_${normalizedCode}`, message: "Google data could not be loaded for this provider." };
  }
  return { code: "GOOGLE_PROVIDER_ERROR", message: "Google data could not be loaded for this provider." };
}

function providerConfigured(name: ProviderRun["name"], integration: { ga4PropertyId: string | null; gscSiteUrl: string | null; gbpAccountId: string | null; gbpLocationId: string | null }) {
  if (name === "GA4") return Boolean(integration.ga4PropertyId);
  if (name === "GSC") return Boolean(integration.gscSiteUrl);
  return Boolean(integration.gbpAccountId && integration.gbpLocationId);
}

function providerWarning(name: ProviderRun["name"], integration: { ga4PropertyId: string | null; gscSiteUrl: string | null; gbpAccountId: string | null; gbpLocationId: string | null }) {
  if (name === "GBP" && Boolean(integration.gbpAccountId) !== Boolean(integration.gbpLocationId)) return { code: "GBP_RESOURCE_INCOMPLETE", message: "GBP account and location must both be selected before GBP sync can run." };
  return null;
}

async function loadProviderResults(accessToken: string, integration: { ga4PropertyId: string | null; gscSiteUrl: string | null; gbpAccountId: string | null; gbpLocationId: string | null }, window: ReturnType<typeof getGoogleSyncWindow>) {
  const providers: ProviderRun[] = [
    { name: "GA4", configured: providerConfigured("GA4", integration) },
    { name: "GSC", configured: providerConfigured("GSC", integration) },
    { name: "GBP", configured: providerConfigured("GBP", integration) },
  ];

  for (const provider of providers) {
    if (!provider.configured) {
      provider.error = providerWarning(provider.name, integration) ?? undefined;
      continue;
    }
    try {
      provider.result = provider.name === "GA4"
        ? await fetchGa4Metrics(accessToken, integration.ga4PropertyId!, window)
        : provider.name === "GSC"
          ? await fetchGscMetrics(accessToken, integration.gscSiteUrl!, window)
          : await fetchGbpMetrics(accessToken, integration.gbpAccountId!, integration.gbpLocationId!, window);
    } catch (error) {
      provider.error = safeError(error);
    }
  }
  return providers;
}

async function writePoints(clientId: string, points: GoogleMetricPoint[], database: Prisma.TransactionClient) {
  const counts = { written: 0, skipped: 0, overridden: 0 };

  if (!points.length) return counts;

  // Resolve the metric definitions and existing values in two reads. The old
  // per-point metric lookup + value lookup + upsert pattern exceeded the
  // transaction timeout once Search Console was enabled alongside GA4/GBP.
  const keys = [...new Set(points.map((point) => point.key))];
  const metrics = await database.metric.findMany({
    where: { clientId, key: { in: keys } },
    select: { id: true, key: true },
  });
  const metricByKey = new Map(metrics.map((metric) => [metric.key, metric.id]));

  const metricIds = metrics.map((metric) => metric.id);
  const sources = [...new Set(points.map((point) => point.source))];
  const existingValues = metricIds.length
    ? await database.metricValue.findMany({
      where: { metricId: { in: metricIds }, source: { in: sources } },
      select: { metricId: true, periodStart: true, periodEnd: true, source: true, dataOrigin: true, isOverride: true },
    })
    : [];
  const existingByKey = new Map(existingValues.map((value) => [
    `${value.metricId}|${value.periodStart.toISOString()}|${value.periodEnd.toISOString()}|${value.source}|${value.dataOrigin}`,
    value,
  ]));

  const rows: Prisma.Sql[] = [];
  for (const point of points) {
    const metricId = metricByKey.get(point.key);
    if (!metricId) {
      counts.skipped += 1;
      continue;
    }

    const valueKey = `${metricId}|${point.periodStart.toISOString()}|${point.periodEnd.toISOString()}|${point.source}|GOOGLE_API`;
    const existing = existingByKey.get(valueKey);
    if (existing?.isOverride) {
      counts.overridden += 1;
      continue;
    }

    counts.written += 1;
    rows.push(Prisma.sql`(
      ${randomUUID()},
      ${metricId},
      ${point.periodStart},
      ${point.periodEnd},
      ${point.value},
      CAST(${point.source} AS "DataSource"),
      ${null},
      false,
      CAST('GOOGLE_API' AS "PortalDataMode"),
      NOW(),
      NOW()
    )`);
  }

  if (rows.length) {
    await database.$executeRaw(Prisma.sql`
      INSERT INTO "MetricValue"
        ("id", "metricId", "periodStart", "periodEnd", "value", "source", "note", "isOverride", "dataOrigin", "createdAt", "updatedAt")
      VALUES ${Prisma.join(rows)}
      ON CONFLICT ("metricId", "periodStart", "periodEnd", "source", "dataOrigin") DO UPDATE
      SET "value" = EXCLUDED."value",
          "note" = EXCLUDED."note",
          "isOverride" = false,
          "dataOrigin" = EXCLUDED."dataOrigin",
          "updatedAt" = NOW()
      WHERE "MetricValue"."isOverride" = false
    `);
  }

  return counts;
}

export async function syncGoogleClient(clientId: string, mode: GoogleSyncMode): Promise<SyncSummary> {
  const integration = await prisma.googleIntegration.findUnique({ where: { clientId } });
  if (!integration) throw new GoogleOAuthError("GOOGLE_INTEGRATION_NOT_FOUND", "Google is not connected for this client.", 404);

  const run = await prisma.integrationSyncRun.create({ data: { integrationId: integration.id, clientId, mode, status: "RUNNING" } });
  await prisma.googleIntegration.update({ where: { id: integration.id }, data: { lastAttemptedAt: new Date() } });

  try {
    const { accessToken } = await getGoogleAccessToken(clientId);
    await provisionGoogleMetrics(clientId);
    const window = getGoogleSyncWindow();
    const providers = await loadProviderResults(accessToken, integration, window);
    const points = providers.flatMap((provider) => provider.result?.points ?? []);
    const warnings = providers.flatMap((provider) => [...(provider.result?.warnings ?? []), ...(provider.error ? [`${provider.name}: ${provider.error.message}`] : [])]);
    const configuredProviders = providers.filter((provider) => provider.configured);
    const successfulProviders = configuredProviders.filter((provider) => provider.result).length;
    const failedProviders = configuredProviders.filter((provider) => provider.error).length;
    const rowsFetched = points.length;

    const counts = await prisma.$transaction(async (transaction) => writePoints(clientId, points, transaction), { maxWait: 10_000, timeout: 30_000 });
    const status = failedProviders === 0 && successfulProviders > 0 ? "SUCCEEDED" : successfulProviders > 0 ? "PARTIAL" : "FAILED";
    const providerErrors = providers.filter((provider) => provider.error).map((provider) => ({ provider: provider.name, code: provider.error!.code, message: provider.error!.message }));
    const errorCode = status === "SUCCEEDED" ? null : providerErrors[0]?.code ?? (failedProviders ? "GOOGLE_PROVIDER_SYNC_PARTIAL" : "GOOGLE_PROVIDER_SYNC_FAILED");
    const errorMessage = warnings.length ? warnings.slice(0, 3).join(" ") : null;
    const completedAt = new Date();

    await prisma.$transaction(async (transaction) => {
      await transaction.integrationSyncRun.update({ where: { id: run.id }, data: { status, completedAt, rowsFetched, rowsWritten: counts.written, rowsSkipped: counts.skipped, rowsOverridden: counts.overridden, warningCount: warnings.length, errorMessage, errorDetails: warnings.length ? { warnings: warnings.slice(0, 20), providerErrors } : undefined } });
      await transaction.googleIntegration.update({ where: { id: integration.id }, data: { lastAttemptedAt: completedAt, ...(successfulProviders > 0 ? { lastSyncedAt: completedAt } : {}), status: "CONNECTED", lastErrorCode: errorCode, lastErrorMessage: errorMessage } });
    });

    return { clientId, status, rowsFetched, rowsWritten: counts.written, rowsSkipped: counts.skipped, rowsOverridden: counts.overridden, warningCount: warnings.length, warnings, ...(errorCode ? { errorCode } : {}) };
  } catch (error) {
    const safe = safeError(error);
    await prisma.$transaction(async (transaction) => {
      await transaction.integrationSyncRun.update({ where: { id: run.id }, data: { status: "FAILED", completedAt: new Date(), warningCount: 1, errorMessage: safe.message, errorDetails: { code: safe.code } } });
      await transaction.googleIntegration.update({ where: { id: integration.id }, data: { lastAttemptedAt: new Date(), lastErrorCode: safe.code, lastErrorMessage: safe.message, ...(safe.code === "invalid_grant" || safe.code === "unauthorized_client" ? { status: "RECONNECT_REQUIRED" } : {}) } });
    });
    return { clientId, status: "FAILED", rowsFetched: 0, rowsWritten: 0, rowsSkipped: 0, rowsOverridden: 0, warningCount: 1, warnings: [safe.message], errorCode: safe.code };
  }
}

export async function syncAllConnectedClients(mode: GoogleSyncMode) {
  const integrations = await prisma.googleIntegration.findMany({ where: { status: "CONNECTED" }, select: { clientId: true } });
  const results: SyncSummary[] = [];
  for (const integration of integrations) results.push(await syncGoogleClient(integration.clientId, mode));
  return results;
}
