export type PortalPreferences = {
  reportUpdates: boolean;
  taskUpdates: boolean;
  teamMessages: boolean;
  compactLayout: boolean;
  reduceMotion: boolean;
};

export const defaultPortalPreferences: PortalPreferences = {
  reportUpdates: true,
  taskUpdates: true,
  teamMessages: true,
  compactLayout: false,
  reduceMotion: false,
};

export const PORTAL_PREFERENCES_STORAGE_KEY = "ai-rankers-portal-preferences:v1";
export const PORTAL_PREFERENCES_EVENT = "ai-rankers:portal-preferences";

export function parsePortalPreferences(value: unknown): PortalPreferences {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ...defaultPortalPreferences };
  const record = value as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(defaultPortalPreferences).map(([key, fallback]) => [key, typeof record[key] === "boolean" ? record[key] : fallback]),
  ) as PortalPreferences;
}

export function applyPortalPreferences(preferences: PortalPreferences) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.portalDensity = preferences.compactLayout ? "compact" : "comfortable";
  document.documentElement.dataset.portalMotion = preferences.reduceMotion ? "reduced" : "full";
}

export function persistPortalPreferences(preferences: PortalPreferences) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PORTAL_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
  applyPortalPreferences(preferences);
  window.dispatchEvent(new CustomEvent<PortalPreferences>(PORTAL_PREFERENCES_EVENT, { detail: preferences }));
}
