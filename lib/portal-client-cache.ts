"use client";

type CacheEntry<T> = {
  value?: T;
  fetchedAt: number;
  pending?: Promise<T>;
};

const entries = new Map<string, CacheEntry<unknown>>();

/**
 * Deduplicate portal bootstrap requests across route remounts in the same tab.
 * Responses remain private to this browser session and are never shared by a
 * server cache or service worker.
 */
export function getPortalClientJson<T>(url: string, options: { ttlMs?: number; force?: boolean; allowedStatuses?: number[] } = {}) {
  const ttlMs = options.ttlMs ?? 30_000;
  const now = Date.now();
  const existing = entries.get(url) as CacheEntry<T> | undefined;

  if (!options.force && existing?.value !== undefined && now - existing.fetchedAt < ttlMs) {
    return Promise.resolve(existing.value);
  }

  if (!options.force && existing?.pending) return existing.pending;

  const pending = fetch(url, { cache: "no-store" })
    .then(async (response) => {
      if (!response.ok && !options.allowedStatuses?.includes(response.status)) throw new Error(`Portal request failed with ${response.status}.`);
      return await response.json() as T;
    })
    .then((value) => {
      entries.set(url, { value, fetchedAt: Date.now() });
      return value;
    })
    .catch((error) => {
      entries.delete(url);
      throw error;
    });

  entries.set(url, { value: existing?.value, fetchedAt: existing?.fetchedAt ?? 0, pending });
  return pending;
}

export function invalidatePortalClientCache(url?: string) {
  if (url) entries.delete(url);
  else entries.clear();
}
