"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { AppShell } from "./app-shell";

export function PortalSkeleton() {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => setTimedOut(true), 8000);
    return () => window.clearTimeout(timeout);
  }, []);

  return <AppShell mode="portal" clientName="Client workspace" brandMark="CL" brandAccent="#F26B38">
    <div className="content loading-content" aria-label="Loading client portal dashboard" aria-live="polite" role="status">
      <div className="loading-heading"><p className="eyebrow">Client portal</p><h1>{timedOut ? "The dashboard is taking longer than expected" : "Loading dashboard data"}</h1><p>{timedOut ? "The workspace did not finish loading. Check your connection and try again." : "Retrieving the client workspace and reporting data."}</p>{timedOut ? <button className="button primary" type="button" onClick={() => window.location.reload()}><RefreshCw size={14} /> Retry loading</button> : null}</div>
      <div className="card skeleton-hero"><span className="skeleton skeleton-label" /><span className="skeleton skeleton-hero-title" /><span className="skeleton skeleton-hero-copy" /></div>
      <div className="metrics-grid">{[1, 2, 3, 4].map((item) => <div className="card skeleton-card" key={item}><span className="skeleton skeleton-small" /><span className="skeleton skeleton-number" /><span className="skeleton skeleton-foot" /></div>)}</div>
      <div className="dashboard-grid"><div className="card skeleton-panel" /><div className="card skeleton-panel" /></div>
    </div>
  </AppShell>;
}
