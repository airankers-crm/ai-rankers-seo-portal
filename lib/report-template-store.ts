import { Prisma } from "@prisma/client";
import { prisma } from "@ai-rankers/db";
import { defaultReportTemplates, type ReportTemplateConfig } from "./report-templates";

export async function ensureReportTemplates() {
  for (const template of defaultReportTemplates) {
    const existing = await prisma.reportTemplate.findUnique({ where: { key: template.key }, select: { id: true, versions: { orderBy: { version: "asc" }, select: { id: true } } } });
    const saved = await prisma.reportTemplate.upsert({
      where: { key: template.key },
      update: { title: template.title, category: template.category, description: template.description, isActive: true },
      create: { key: template.key, title: template.title, category: template.category, description: template.description },
      select: { id: true },
    });
    if (!existing?.versions.length) {
      await prisma.reportTemplateVersion.create({ data: { templateId: saved.id, version: 1, label: "Initial approved structure", status: "PUBLISHED", config: template.config as unknown as Prisma.InputJsonValue, publishedAt: new Date() } });
    }
  }
}

export function parseTemplateConfig(value: Prisma.JsonValue, fallback: ReportTemplateConfig): ReportTemplateConfig {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return fallback;
  const record = value as Record<string, unknown>;
  const sections = Array.isArray(record.sections) ? record.sections.flatMap((section) => {
    if (typeof section !== "object" || section === null || Array.isArray(section)) return [];
    const item = section as Record<string, unknown>;
    if (typeof item.key !== "string" || typeof item.label !== "string" || typeof item.description !== "string") return [];
    return [{ key: item.key, label: item.label, description: item.description, visible: item.visible !== false }];
  }) : fallback.sections;
  const metrics = Array.isArray(record.metrics) ? record.metrics.filter((metric): metric is string => typeof metric === "string").slice(0, 24) : fallback.metrics;
  return {
    coverTitle: typeof record.coverTitle === "string" && record.coverTitle.trim() ? record.coverTitle.trim().slice(0, 120) : fallback.coverTitle,
    coverDescription: typeof record.coverDescription === "string" && record.coverDescription.trim() ? record.coverDescription.trim().slice(0, 240) : fallback.coverDescription,
    sections: sections.length ? sections : fallback.sections,
    metrics: metrics.length ? metrics : fallback.metrics,
  };
}
