import { AppShell } from "./app-shell";

export function PortalSkeleton() {
  return <AppShell mode="portal" clientName="Client workspace" brandMark="CL" brandAccent="#F26B38">
    <div className="content loading-content" aria-label="Loading client presentation dashboard" aria-live="polite" role="status">
      <div className="loading-heading"><p className="eyebrow">Client portal</p><h1>Loading dashboard data</h1><p>Retrieving the client workspace and reporting data.</p></div>
      <div className="card skeleton-hero"><span className="skeleton skeleton-label" /><span className="skeleton skeleton-hero-title" /><span className="skeleton skeleton-hero-copy" /></div>
      <div className="metrics-grid">{[1, 2, 3, 4].map((item) => <div className="card skeleton-card" key={item}><span className="skeleton skeleton-small" /><span className="skeleton skeleton-number" /><span className="skeleton skeleton-foot" /></div>)}</div>
      <div className="dashboard-grid"><div className="card skeleton-panel" /><div className="card skeleton-panel" /></div>
    </div>
  </AppShell>;
}
