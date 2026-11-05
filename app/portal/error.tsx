"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { AppShell } from "../../components/app-shell";

export default function PortalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <AppShell mode="portal" clientName="Client workspace" brandMark="CL" brandAccent="#F26B38">
    <main className="content error-content">
      <section className="card error-state" role="alert">
        <div className="error-icon"><AlertTriangle size={20} /></div>
        <p className="eyebrow">Client portal</p>
        <h1>We couldn’t load this view.</h1>
        <p>Your workspace is safe. Try refreshing the dashboard, and contact your SEO team if the problem continues.</p>
        <button type="button" className="button primary" onClick={() => reset()}><RefreshCw size={14} /> Try again</button>
      </section>
    </main>
  </AppShell>;
}
