"use client";

import { CheckCircle2, Database, Globe2, Loader2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

type DataMode = "MANAGED" | "GOOGLE_API";

export function ClientDataSourceToggle({ clientId, initialMode, googleStatus, lastSyncedAt }: { clientId: string; initialMode: DataMode; googleStatus: string; lastSyncedAt: string | null }) {
  const router = useRouter();
  const [mode, setMode] = useState<DataMode>(initialMode);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function save(nextMode: DataMode) {
    if (nextMode === mode) return;
    setPending(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch(`/api/admin/clients/${clientId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dataMode: nextMode }),
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error ?? "The portal data source could not be changed.");
      setMode(nextMode);
      setMessage(nextMode === "MANAGED" ? "Client portal is now showing managed DB data." : "Client portal is now showing Google API data.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The portal data source could not be changed.");
    } finally {
      setPending(false);
    }
  }

  const googleReady = googleStatus === "CONNECTED";

  return <section className="card panel client-data-source-card" aria-labelledby="client-data-source-title">
    <div className="client-data-source-heading">
      <div className="client-data-source-icon"><Database size={17} /></div>
      <div><p className="eyebrow">Super Admin control</p><h2 id="client-data-source-title">Client portal data source</h2><p>Imported CSV values and admin edits stay in the managed database. Google values are synced into the same database with a separate origin, so the portal can show one source set at a time.</p></div>
    </div>
    <div className="client-data-source-toggle" role="group" aria-label="Choose the client portal data source">
      <button type="button" className={mode === "MANAGED" ? "active" : ""} onClick={() => void save("MANAGED")} disabled={pending} aria-pressed={mode === "MANAGED"}><Database size={15} /><span><strong>Managed DB data</strong><small>CSV imports + Super Admin edits</small></span>{mode === "MANAGED" ? <CheckCircle2 size={15} /> : null}</button>
      <button type="button" className={mode === "GOOGLE_API" ? "active" : ""} onClick={() => void save("GOOGLE_API")} disabled={pending} aria-pressed={mode === "GOOGLE_API"}><Globe2 size={15} /><span><strong>Google API data</strong><small>{googleReady ? "Latest synced provider values" : "No live connection · existing synced rows only"}</small></span>{mode === "GOOGLE_API" ? <CheckCircle2 size={15} /> : null}</button>
    </div>
    <div className="client-data-source-meta"><span className={`status ${googleReady ? "complete" : "progress"}`}>{googleReady ? "Google connected" : "Google not connected"}</span><span>{lastSyncedAt ? `Last Google sync ${new Date(lastSyncedAt).toLocaleString()}` : "No Google sync recorded"}</span>{pending ? <span><Loader2 size={13} className="spin" /> Saving source…</span> : null}</div>
    {message ? <p className="save-status" role="status"><CheckCircle2 size={14} /> {message}</p> : null}
    {error ? <p className="auth-error" role="alert">{error}</p> : null}
  </section>;
}
