export function isSameOriginRequest(request: Request) {
  const configuredOrigin = process.env.APP_ORIGIN?.trim();
  let expectedOrigin: string;
  try {
    expectedOrigin = new URL(configuredOrigin || request.url).origin;
  } catch {
    return false;
  }

  const origin = request.headers.get("origin");
  if (origin) return origin === expectedOrigin;

  const referer = request.headers.get("referer");
  if (!referer) return false;
  try {
    return new URL(referer).origin === expectedOrigin;
  } catch {
    return false;
  }
}
