"use client";

import { useEffect } from "react";
import { getPortalClientJson } from "../lib/portal-client-cache";
import {
  applyPortalPreferences,
  defaultPortalPreferences,
  parsePortalPreferences,
  persistPortalPreferences,
  PORTAL_PREFERENCES_EVENT,
  PORTAL_PREFERENCES_STORAGE_KEY,
  type PortalPreferences,
} from "../lib/portal-preferences";

export function PortalPreferenceEffects() {
  useEffect(() => {
    let active = true;
    try {
      const cached = window.localStorage.getItem(PORTAL_PREFERENCES_STORAGE_KEY);
      applyPortalPreferences(cached ? parsePortalPreferences(JSON.parse(cached)) : defaultPortalPreferences);
    } catch {
      applyPortalPreferences(defaultPortalPreferences);
    }

    void getPortalClientJson<{ preferences?: unknown }>("/api/portal/account", { ttlMs: 60_000 })
      .then((payload) => {
        if (!active || !payload) return;
        persistPortalPreferences(parsePortalPreferences(payload.preferences));
      })
      .catch(() => undefined);

    const onPreferences = (event: Event) => {
      const detail = (event as CustomEvent<PortalPreferences>).detail;
      if (detail) applyPortalPreferences(parsePortalPreferences(detail));
    };
    window.addEventListener(PORTAL_PREFERENCES_EVENT, onPreferences);
    return () => {
      active = false;
      window.removeEventListener(PORTAL_PREFERENCES_EVENT, onPreferences);
    };
  }, []);

  return null;
}
