"use client";

import { useMemo, useState } from "react";
import { RefreshCw, ShieldCheck, Unplug } from "lucide-react";
import { AppShell } from "./app-shell";

type IntegrationRow = {
  id: string;
  businessName: string;
  status: string;
  googleAccountEmail: string | null;
  ga4PropertyId: string | null;
  gscSiteUrl: string | null;
  gbpAccountId: string | null;
  gbpLocationId: string | null;
  lastSyncedAt: string | null;
  lastErrorMessage: string | null;
};

type Resources = {
  ga4Properties: Array<{ id: string; label: string; accountId: string }>;
  gscSites: Array<{ id: string; label: string; permissionLevel?: string }>;
  gbpAccounts: Array<{ id: string; label: string }>;
  gbpLocations: Array<{ id: string; label: string; accountId: string }>;
};

function statusLabel(status: string) {
  if (status === "CONNECTED") return "Connected";
  if (status === "CONNECTING") return "Connecting";
  if (status === "RECONNECT_REQUIRED") return "Reconnect required";
  if (status === "ERROR") return "Error";
  return "Not connected";
}

export function GoogleIntegrationsAdmin({ clients, queryMessage }: { clients: IntegrationRow[]; queryMessage?: string | null }) {
  const [selectedId, setSelectedId] = useState(clients[0]?.id ?? "");
  const selected = useMemo(() => clients.find((client) => client.id === selectedId) ?? null, [clients, selectedId]);
  const [resources, setResources] = useState<Resources | null>(null);
  const [ga4PropertyId, setGa4PropertyId] = useState(selected?.ga4PropertyId ?? "");
  const [gscSiteUrl, setGscSiteUrl] = useState(selected?.gscSiteUrl ?? "");
  const [gbpAccountId, setGbpAccountId] = useState(selected?.gbpAccountId ?? "");
  const [gbpLocationId, setGbpLocationId] = useState(selected?.gbpLocationId ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(queryMessage ?? "");

  function selectClient(clientId: string) {
    const next = clients.find((client) => client.id === clientId);
    setSelectedId(clientId);
    setResources(null);
    setGa4PropertyId(next?.ga4PropertyId ?? "");
    setGscSiteUrl(next?.gscSiteUrl ?? "");
    setGbpAccountId(next?.gbpAccountId ?? "");
    setGbpLocationId(next?.gbpLocationId ?? "");
    setMessage("");
  }

  async function discover() {
    if (!selected) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/integrations/google/properties?clientId=${encodeURIComponent(selected.id)}`, { cache: "no-store" });
      const payload = await response.json() as { resources?: Resources; errors?: Record<string, string | null>; error?: string };
      if (!response.ok || !payload.resources) throw new Error(payload.error ?? "Google resources could not be loaded.");
      setResources(payload.resources);
      setMessage(Object.values(payload.errors ?? {}).filter(Boolean).join(" ") || "Google resources loaded.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Google resources could not be loaded.");
    } finally {
      setBusy(false);
    }
  }

  async function saveConfiguration() {
    if (!selected) return;
    setBusy(true);
    try {
      const response = await fetch("/api/integrations/google/config", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ clientId: selected.id, ga4PropertyId, gscSiteUrl, gbpAccountId, gbpLocationId }) });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Google configuration could not be saved.");
      setMessage("Google resource selections saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Google configuration could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function syncNow() {
    if (!selected) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/integrations/google/sync", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ clientId: selected.id }) });
      const payload = await response.json() as { summary?: { status: string; rowsWritten: number; warningCount: number }; error?: string };
      if (!response.ok || !payload.summary) throw new Error(payload.error ?? "Google sync could not be completed.");
      setMessage(`${payload.summary.status === "SUCCEEDED" ? "Google data synced" : "Google sync completed with warnings"}: ${payload.summary.rowsWritten} values written${payload.summary.warningCount ? `, ${payload.summary.warningCount} warning(s)` : ""}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Google sync could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    if (!selected || !window.confirm(`Disconnect Google for ${selected.businessName}?`)) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/integrations/google/disconnect?clientId=${encodeURIComponent(selected.id)}`, { method: "DELETE" });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Google could not be disconnected.");
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Google could not be disconnected.");
      setBusy(false);
    }
  }

  return <AppShell mode="admin" activeNav="Integrations">
    <div className="content">
      <div className="page-heading"><div><h1>Google integrations</h1><p>Super Admin connection, property selection, and provider readiness for every client workspace.</p></div></div>
      <section className="ops-context card"><div className="ops-context-icon"><ShieldCheck size={17} /></div><div><strong>Credentials stay server-side</strong><p>Client users can view published reporting only. Google connections are managed here by the Super Admin.</p></div><span className="status progress">Tenant-scoped</span></section>
      <section className="card" style={{ padding: 18, marginBottom: 14 }}>
        <label style={{ display: "grid", gap: 6, maxWidth: 520 }}><span className="eyebrow">Client workspace</span><select value={selectedId} onChange={(event) => selectClient(event.target.value)} style={{ minHeight: 38, padding: "0 10px", border: "1px solid var(--line)", borderRadius: 7, background: "white", color: "var(--ink)" }}>{clients.map((client) => <option key={client.id} value={client.id}>{client.businessName}</option>)}</select></label>
      </section>
      {selected ? <section className="card" style={{ padding: 18 }}>
        <div className="page-heading" style={{ marginBottom: 18 }}><div><p className="eyebrow">Google connection</p><h2>{selected.businessName}</h2><p>{selected.googleAccountEmail ?? "No Google account connected"}</p></div><span className={`status ${selected.status === "CONNECTED" ? "complete" : selected.status === "ERROR" || selected.status === "RECONNECT_REQUIRED" ? "urgent" : "planned"}`}>{statusLabel(selected.status)}</span></div>
        {selected.status === "CONNECTED" ? <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}><button className="button" type="button" onClick={discover} disabled={busy}><RefreshCw size={14} /> {busy ? "Loading" : "Discover Google resources"}</button><button className="button primary" type="button" onClick={syncNow} disabled={busy}><RefreshCw size={14} /> {busy ? "Syncing" : "Sync Google data now"}</button><button className="button" type="button" onClick={disconnect} disabled={busy}><Unplug size={14} /> Disconnect</button></div>
          <div className="setup-source-layout">
            <label><span className="eyebrow">GA4 property</span><select value={ga4PropertyId} onChange={(event) => setGa4PropertyId(event.target.value)} disabled={!resources || busy}><option value="">Select a GA4 property</option>{resources?.ga4Properties.map((property) => <option key={property.id} value={property.id}>{property.label} ({property.id})</option>)}</select></label>
            <label><span className="eyebrow">Search Console site</span><select value={gscSiteUrl} onChange={(event) => setGscSiteUrl(event.target.value)} disabled={!resources || busy}><option value="">Select a Search Console site</option>{resources?.gscSites.map((site) => <option key={site.id} value={site.id}>{site.label}</option>)}</select></label>
            <label><span className="eyebrow">GBP account</span><select value={gbpAccountId} onChange={(event) => { setGbpAccountId(event.target.value); setGbpLocationId(""); }} disabled={!resources || busy}><option value="">Select a GBP account</option>{resources?.gbpAccounts.map((account) => <option key={account.id} value={account.id}>{account.label}</option>)}</select></label>
            <label><span className="eyebrow">GBP location</span><select value={gbpLocationId} onChange={(event) => setGbpLocationId(event.target.value)} disabled={!resources || !gbpAccountId || busy}><option value="">Select a GBP location</option>{resources?.gbpLocations.filter((location) => location.accountId === gbpAccountId).map((location) => <option key={location.id} value={location.id}>{location.label}</option>)}</select></label>
          </div>
          <button className="button primary" type="button" onClick={saveConfiguration} disabled={!resources || busy} style={{ marginTop: 16 }}>Save resource selections</button>
        </> : <a className="button primary" href={`/api/integrations/google/connect?clientId=${encodeURIComponent(selected.id)}`}>Connect Google</a>}
        {selected.lastSyncedAt ? <p style={{ marginTop: 16, color: "var(--muted)", fontSize: 12 }}>Last sync: {new Date(selected.lastSyncedAt).toLocaleString()}</p> : null}
        {selected.lastErrorMessage ? <p style={{ marginTop: 8, color: "#b42318", fontSize: 12 }}>{selected.lastErrorMessage}</p> : null}
        {message ? <p style={{ marginTop: 12, color: "var(--muted)", fontSize: 12 }}>{message}</p> : null}
      </section> : <section className="ops-empty card"><div><h3>No client workspaces found</h3><p>Create a client workspace before configuring Google.</p></div></section>}
    </div>
  </AppShell>;
}
