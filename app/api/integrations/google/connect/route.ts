import { NextResponse } from "next/server";
import { prisma } from "@ai-rankers/db";
import { requireAdminAccess } from "../../../../../lib/auth/access";
import { encryptSecret, hashOpaqueValue } from "../../../../../lib/security/encryption";
import { buildGoogleAuthorizationUrl, createOAuthState, createPkce, getGoogleOAuthConfig } from "../../../../../lib/google/oauth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const access = await requireAdminAccess();
  if (access.preview || !access.user) return NextResponse.json({ error: "Super Admin authentication is required." }, { status: 401 });

  const requestUrl = new URL(request.url);
  const clientId = requestUrl.searchParams.get("clientId")?.trim();
  if (!clientId) return NextResponse.json({ error: "clientId is required." }, { status: 400 });

  const client = await prisma.client.findUnique({ where: { id: clientId }, select: { id: true, status: true } });
  if (!client || client.status === "ARCHIVED") return NextResponse.json({ error: "Client workspace was not found." }, { status: 404 });

  const config = getGoogleOAuthConfig();
  if (!config) return NextResponse.redirect(new URL(`/admin/integrations?error=google_oauth_not_configured&clientId=${encodeURIComponent(clientId)}`, requestUrl));

  const { verifier, challenge } = createPkce();
  const state = createOAuthState();
  await prisma.$transaction(async (transaction) => {
    await transaction.googleIntegration.upsert({
      where: { clientId },
      update: { status: "CONNECTING", lastErrorCode: null, lastErrorMessage: null },
      create: { clientId, status: "CONNECTING" },
    });
    await transaction.googleOAuthState.create({ data: { stateHash: hashOpaqueValue(state), clientId, userId: access.user!.id, returnPath: "/admin/integrations", encryptedCodeVerifier: encryptSecret(verifier), expiresAt: new Date(Date.now() + 10 * 60_000) } });
  });

  return NextResponse.redirect(buildGoogleAuthorizationUrl(config, state, challenge));
}
