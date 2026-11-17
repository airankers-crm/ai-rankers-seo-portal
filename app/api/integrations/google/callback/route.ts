import { NextResponse } from "next/server";
import { prisma } from "@ai-rankers/db";
import { requireAdminAccess } from "../../../../../lib/auth/access";
import { decryptSecret, encryptSecret, hashOpaqueValue } from "../../../../../lib/security/encryption";
import { exchangeAuthorizationCode, fetchGoogleIdentity, getGoogleOAuthConfig, GoogleOAuthError } from "../../../../../lib/google/oauth";
import { provisionGoogleMetrics } from "../../../../../lib/google/provision";

export const dynamic = "force-dynamic";

function redirectToAdmin(requestUrl: URL, params: Record<string, string>) {
  const target = new URL("/admin/integrations", requestUrl);
  for (const [key, value] of Object.entries(params)) target.searchParams.set(key, value);
  return NextResponse.redirect(target);
}

export async function GET(request: Request) {
  const access = await requireAdminAccess();
  const requestUrl = new URL(request.url);
  if (access.preview || !access.user) return redirectToAdmin(requestUrl, { error: "auth_required" });

  const stateValue = requestUrl.searchParams.get("state");
  const code = requestUrl.searchParams.get("code");
  const providerError = requestUrl.searchParams.get("error");
  if (providerError) return redirectToAdmin(requestUrl, { error: "google_authorization_denied" });
  if (!stateValue || !code) return redirectToAdmin(requestUrl, { error: "google_callback_invalid" });

  const stateRecord = await prisma.googleOAuthState.findUnique({ where: { stateHash: hashOpaqueValue(stateValue) } });
  if (!stateRecord || stateRecord.userId !== access.user.id || stateRecord.expiresAt <= new Date() || stateRecord.consumedAt) {
    return redirectToAdmin(requestUrl, { error: "google_callback_state_invalid" });
  }

  const consumed = await prisma.googleOAuthState.updateMany({ where: { id: stateRecord.id, consumedAt: null }, data: { consumedAt: new Date() } });
  if (consumed.count !== 1) return redirectToAdmin(requestUrl, { error: "google_callback_state_reused" });

  try {
    const config = getGoogleOAuthConfig();
    if (!config) throw new GoogleOAuthError("GOOGLE_OAUTH_NOT_CONFIGURED", "Google OAuth is not configured.", 503);

    const token = await exchangeAuthorizationCode(code, decryptSecret(stateRecord.encryptedCodeVerifier));
    const identity = await fetchGoogleIdentity(token.access_token);
    const existing = await prisma.googleIntegration.findUnique({ where: { clientId: stateRecord.clientId }, select: { encryptedRefreshToken: true } });
    if (!token.refresh_token && !existing?.encryptedRefreshToken) throw new GoogleOAuthError("GOOGLE_REFRESH_TOKEN_MISSING", "Google did not return a refresh token. Reconnect with consent.", 400);

    const now = new Date();
    await prisma.$transaction(async (transaction) => {
      await transaction.googleIntegration.upsert({
        where: { clientId: stateRecord.clientId },
        update: {
          status: "CONNECTED",
          googleAccountEmail: identity.email ?? null,
          googleSubject: identity.sub ?? null,
          scopes: token.scope?.split(" ").filter(Boolean) ?? [],
          encryptedAccessToken: encryptSecret(token.access_token),
          encryptedRefreshToken: token.refresh_token ? encryptSecret(token.refresh_token) : undefined,
          accessTokenExpiresAt: token.expires_in ? new Date(now.getTime() + token.expires_in * 1000) : null,
          lastErrorCode: null,
          lastErrorMessage: null,
          connectedAt: now,
          disconnectedAt: null,
        },
        create: {
          clientId: stateRecord.clientId,
          status: "CONNECTED",
          googleAccountEmail: identity.email ?? null,
          googleSubject: identity.sub ?? null,
          scopes: token.scope?.split(" ").filter(Boolean) ?? [],
          encryptedAccessToken: encryptSecret(token.access_token),
          encryptedRefreshToken: token.refresh_token ? encryptSecret(token.refresh_token) : null,
          accessTokenExpiresAt: token.expires_in ? new Date(now.getTime() + token.expires_in * 1000) : null,
          connectedAt: now,
        },
      });
      await provisionGoogleMetrics(stateRecord.clientId, transaction);
      await transaction.auditLog.create({ data: { clientId: stateRecord.clientId, actorId: access.user!.id, action: "GOOGLE_INTEGRATION_CONNECTED", entityType: "GoogleIntegration", after: { googleAccountEmail: identity.email ?? null } } });
    });

    return redirectToAdmin(requestUrl, { connected: "1", clientId: stateRecord.clientId });
  } catch (error) {
    const code = error instanceof GoogleOAuthError ? error.code : "GOOGLE_CALLBACK_FAILED";
    const message = error instanceof Error ? error.message.slice(0, 500) : "Google connection failed.";
    await prisma.googleIntegration.updateMany({ where: { clientId: stateRecord.clientId }, data: { status: "ERROR", lastErrorCode: code, lastErrorMessage: message } });
    return redirectToAdmin(requestUrl, { error: "google_callback_failed", clientId: stateRecord.clientId });
  }
}
