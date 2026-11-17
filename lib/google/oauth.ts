import { createHash, randomBytes } from "node:crypto";

export const GOOGLE_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/analytics.readonly",
  "https://www.googleapis.com/auth/webmasters.readonly",
  "https://www.googleapis.com/auth/business.manage",
] as const;

type GoogleOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

type GoogleTokenResponse = {
  access_token: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
};

export class GoogleOAuthError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 502) {
    super(message);
    this.name = "GoogleOAuthError";
  }
}

export function getGoogleOAuthConfig(): GoogleOAuthConfig | null {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim();
  if (!clientId || !clientSecret || !redirectUri) return null;
  return { clientId, clientSecret, redirectUri };
}

export function createPkce() {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function createOAuthState() {
  return randomBytes(32).toString("base64url");
}

export function buildGoogleAuthorizationUrl(config: GoogleOAuthConfig, state: string, codeChallenge: string) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("scope", GOOGLE_SCOPES.join(" "));
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url;
}

async function readGoogleError(response: Response, fallback: string) {
  const payload = await response.json().catch(() => null) as { error?: string; error_description?: string } | null;
  const code = payload?.error || `HTTP_${response.status}`;
  const message = payload?.error_description || fallback;
  return new GoogleOAuthError(code, message, response.status >= 400 && response.status < 500 ? 400 : 502);
}

export async function exchangeAuthorizationCode(code: string, verifier: string) {
  const config = getGoogleOAuthConfig();
  if (!config) throw new GoogleOAuthError("GOOGLE_OAUTH_NOT_CONFIGURED", "Google OAuth is not configured.", 503);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, code, code_verifier: verifier, grant_type: "authorization_code", redirect_uri: config.redirectUri }),
    cache: "no-store",
  });
  if (!response.ok) throw await readGoogleError(response, "Google authorization code exchange failed.");
  return await response.json() as GoogleTokenResponse;
}

export async function refreshGoogleAccessToken(refreshToken: string) {
  const config = getGoogleOAuthConfig();
  if (!config) throw new GoogleOAuthError("GOOGLE_OAUTH_NOT_CONFIGURED", "Google OAuth is not configured.", 503);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" }),
    cache: "no-store",
  });
  if (!response.ok) throw await readGoogleError(response, "Google access-token refresh failed.");
  return await response.json() as GoogleTokenResponse;
}

export async function fetchGoogleIdentity(accessToken: string) {
  const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { authorization: `Bearer ${accessToken}` }, cache: "no-store" });
  if (!response.ok) throw await readGoogleError(response, "Google account identity lookup failed.");
  return await response.json() as { sub?: string; email?: string; email_verified?: boolean };
}

export async function revokeGoogleToken(token: string) {
  const response = await fetch("https://oauth2.googleapis.com/revoke", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token }),
    cache: "no-store",
  });
  if (!response.ok && response.status !== 400) throw await readGoogleError(response, "Google token revocation failed.");
}

export async function googleApiFetch<T>(url: string, accessToken: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  headers.set("authorization", `Bearer ${accessToken}`);
  headers.set("accept", "application/json");
  const response = await fetch(url, { ...init, headers, cache: "no-store" });
  if (!response.ok) throw await readGoogleError(response, "Google API request failed.");
  return await response.json() as T;
}
