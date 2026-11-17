import { NextResponse } from "next/server";
import { prisma } from "@ai-rankers/db";
import { requireAdminAccess } from "../../../../../lib/auth/access";
import { decryptSecret } from "../../../../../lib/security/encryption";
import { revokeGoogleToken } from "../../../../../lib/google/oauth";

export const dynamic = "force-dynamic";

export async function DELETE(request: Request) {
  const access = await requireAdminAccess();
  if (access.preview || !access.user) return NextResponse.json({ error: "Super Admin authentication is required." }, { status: 401 });

  const clientId = new URL(request.url).searchParams.get("clientId")?.trim();
  if (!clientId) return NextResponse.json({ error: "clientId is required." }, { status: 400 });

  const integration = await prisma.googleIntegration.findUnique({ where: { clientId }, select: { id: true, encryptedRefreshToken: true, encryptedAccessToken: true } });
  if (!integration) return NextResponse.json({ disconnected: true, alreadyDisconnected: true });

  let revocationAttempted = false;
  const tokenPayload = integration.encryptedRefreshToken ?? integration.encryptedAccessToken;
  if (tokenPayload) {
    try {
      revocationAttempted = true;
      await revokeGoogleToken(decryptSecret(tokenPayload));
    } catch {
      // Local credentials are still removed below even if Google's revoke endpoint is unavailable.
    }
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.googleIntegration.delete({ where: { id: integration.id } });
    await transaction.auditLog.create({ data: { clientId, actorId: access.user!.id, action: "GOOGLE_INTEGRATION_DISCONNECTED", entityType: "GoogleIntegration", entityId: integration.id, after: { revocationAttempted } } });
  });

  return NextResponse.json({ disconnected: true, revocationAttempted });
}
