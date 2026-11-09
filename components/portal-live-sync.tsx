"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const SYNC_INTERVAL_MS = 10_000;

export function PortalLiveSync() {
  const router = useRouter();
  const latestChangeRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;

    async function checkForChanges() {
      if (document.visibilityState === "hidden") return;

      try {
        const response = await fetch("/api/portal/sync", { cache: "no-store" });
        if (!response.ok || !active) return;

        const payload = await response.json() as { changedAt?: string | null };
        if (!payload.changedAt) return;

        if (latestChangeRef.current && latestChangeRef.current !== payload.changedAt) {
          latestChangeRef.current = payload.changedAt;
          router.refresh();
          return;
        }

        latestChangeRef.current = payload.changedAt;
      } catch {
        // A temporary sync failure should not interrupt the client presentation.
      }
    }

    void checkForChanges();
    const interval = window.setInterval(() => void checkForChanges(), SYNC_INTERVAL_MS);
    const onVisible = () => void checkForChanges();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router]);

  return <span className="live-sync-pill" title="This portal checks for newly published admin changes automatically"><span className="dot" /> Auto-sync on</span>;
}
