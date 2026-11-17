"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const SYNC_INTERVAL_MS = 60_000;

export function PortalLiveSync() {
  const router = useRouter();
  const latestChangeRef = useRef<string | null>(null);
  const [syncLabel, setSyncLabel] = useState("Checking updates");

  useEffect(() => {
    let active = true;

    async function checkForChanges() {
      if (document.visibilityState === "hidden") return;

      try {
        const response = await fetch("/api/portal/sync", { cache: "no-store" });
        if (!active) return;
        if (!response.ok) {
          setSyncLabel("Updates temporarily unavailable");
          return;
        }

        setSyncLabel("Portal up to date");

        const payload = await response.json() as { changedAt?: string | null };
        if (!payload.changedAt) return;

        if (latestChangeRef.current && latestChangeRef.current !== payload.changedAt) {
          latestChangeRef.current = payload.changedAt;
          router.refresh();
          return;
        }

        latestChangeRef.current = payload.changedAt;
      } catch {
        if (active) setSyncLabel("Updates temporarily unavailable");
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

  return <span className="live-sync-pill" title="This checks for newly published workspace changes; it is not a provider-sync status."><span className="dot" /> {syncLabel}</span>;
}
