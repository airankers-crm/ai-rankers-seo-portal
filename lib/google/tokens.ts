import { prisma } from "@ai-rankers/db";
import { decryptSecret, encryptSecret } from "../security/encryption";
import { GoogleOAuthError, refreshGoogleAccessToken } from "./oauth";

export async function getGoogleAccessToken(clientId: string) {
  const integration = await prisma.googleIntegration.findUnique({ where: { clientId } });
  if (!integration || integration.status !== "CONNECTED") throw new GoogleOAuthError("GOOGLE_INTEGRATION_NOT_CONNECTED", "Google is not connected for this client.", 409);

  const refreshToken = integration.encryptedRefreshToken ? decryptSecret(integration.encryptedRefreshToken) : null;
  if (!refreshToken) throw new GoogleOAuthError("GOOGLE_REFRESH_TOKEN_MISSING", "Google must be reconnected before it can sync.", 409);

  if (integration.encryptedAccessToken && integration.accessTokenExpiresAt && integration.accessTokenExpiresAt.getTime() > Date.now() + 60_000) {
    return { accessToken: decryptSecret(integration.encryptedAccessToken), integration };
  }

  try {
    const token = await refreshGoogleAccessToken(refreshToken);
    const expiresAt = token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null;
    const updated = await prisma.googleIntegration.update({ where: { id: integration.id }, data: { encryptedAccessToken: encryptSecret(token.access_token), accessTokenExpiresAt: expiresAt, lastErrorCode: null, lastErrorMessage: null } });
    return { accessToken: token.access_token, integration: updated };
  } catch (error) {
    if (error instanceof GoogleOAuthError && (error.code === "invalid_grant" || error.code === "unauthorized_client")) {
      await prisma.googleIntegration.update({ where: { id: integration.id }, data: { status: "RECONNECT_REQUIRED", lastErrorCode: error.code, lastErrorMessage: "Google authorization has expired or been revoked." } });
    }
    throw error;
  }
}
