import { prisma } from "@ai-rankers/db";

export type PortalService = "website" | "analytics" | "gbp";

export type PortalServiceEntitlements = {
  website: boolean;
  analytics: boolean;
  gbp: boolean;
};

export async function getPortalServiceEntitlements(clientId: string): Promise<PortalServiceEntitlements | null> {
  const client = await prisma.client.findUnique({ where: { id: clientId }, select: { hasWebsiteSeo: true, hasAnalytics: true, hasGbpSeo: true } });
  if (!client) return null;
  return { website: client.hasWebsiteSeo, analytics: client.hasAnalytics, gbp: client.hasGbpSeo };
}
