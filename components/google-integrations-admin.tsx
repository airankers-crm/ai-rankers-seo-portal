"use client";

import { useMemo, useState } from "react";
import { BarChart3, Building2, CheckCircle2, Clock3, Database, Globe2, Link2, MapPin, RefreshCw, Search, ShieldCheck, Unplug } from "lucide-react";
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

function statusClass(status: string) {
  if (status === "CONNECTED") return "is-connected";
  if (status === "ERROR" || status === "RECONNECT_REQUIRED") return "is-warning";
  return "is-pending";
}

export function GoogleIntegrationsAdmin({ clients, queryMessage }: { clients: IntegrationRow[]; queryMessage?: string | null }) {
  const [clientRows, setClientRows] = useState(clients);
  const [selectedId, setSelectedId] = useState(clients[0]?.id ?? "");
  const selected = useMemo(() => clientRows.find((client) => client.id === selectedId) ?? null, [clientRows, selectedId]);
  const [resources, setResources] = useState<Resources | null>(null);
  const [ga4PropertyId, setGa4PropertyId] = useState(selected?.ga4PropertyId ?? "");
  const [gscSiteUrl, setGscSiteUrl] = useState(selected?.gscSiteUrl ?? "");
  const [gbpAccountId, setGbpAccountId] = useState(selected?.gbpAccountId ?? "");
  const [gbpLocationId, setGbpLocationId] = useState(selected?.gbpLocationId ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(queryMessage ?? "");

  function selectClient(clientId: string) {
    const next = clientRows.find((client) => client.id === clientId);
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
      setClientRows((current) => current.map((client) => client.id === selected.id ? { ...client, lastSyncedAt: new Date().toISOString(), lastErrorMessage: null } : client));
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

  const configuredResourceCount = [ga4PropertyId, gscSiteUrl, gbpAccountId, gbpLocationId].filter(Boolean).length;

  return <AppShell mode="admin" activeNav="Integrations">
    <div className="content integrations-page">
      <div className="page-heading integrations-page-heading">
        <div><p className="eyebrow">Admin control center</p><h1>Google integrations</h1><p>Connect Google once, then map the approved reporting resources for each client workspace.</p></div>
        <span className="integration-page-status"><span className="integration-live-dot" /> Provider status</span>
      </div>

      <section className="integration-workspace-picker card">
        <div className="integration-picker-intro"><span className="integration-picker-icon"><Building2 size={18} /></span><div><p className="eyebrow">Workspace</p><h2>Select a client workspace</h2><p>Choose the client whose Google resources you want to manage.</p></div></div>
        <label className="integration-workspace-field"><span>Client workspace</span><div className="integration-select-shell"><select value={selectedId} onChange={(event) => selectClient(event.target.value)}>{clients.map((client) => <option key={client.id} value={client.id}>{client.businessName}</option>)}</select></div></label>
      </section>

      {selected ? <section className="integration-connection-card card">
        <div className="integration-card-header">
          <div className="integration-client-identity"><span className="integration-client-mark">{selected.businessName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span><div><p className="eyebrow">Google connection</p><h2>{selected.businessName}</h2><p className="integration-account"><Globe2 size={13} /> {selected.googleAccountEmail ?? "No Google account connected"}</p></div></div>
          <span className={`integration-status ${statusClass(selected.status)}`}><span className="integration-status-dot" />{statusLabel(selected.status)}</span>
        </div>

        {selected.status === "CONNECTED" ? <>
          <div className="integration-action-bar"><div><strong>Connection actions</strong><span>Refresh resources or pull the latest provider data.</span></div><div className="integration-actions"><button className="button" type="button" onClick={discover} disabled={busy}><Search size={14} /> {busy ? "Loading" : "Discover resources"}</button><button className="button primary" type="button" onClick={syncNow} disabled={busy}><RefreshCw size={14} /> {busy ? "Syncing" : "Sync data now"}</button><button className="button integration-disconnect-button" type="button" onClick={disconnect} disabled={busy}><Unplug size={14} /> Disconnect</button></div></div>

          <div className="integration-resource-section">
            <div className="integration-section-heading"><div><p className="eyebrow">Resource mapping</p><h3>Choose reporting resources</h3><p>Map each Google source to the client workspace. These selections power reporting and sync.</p></div><span className="integration-selection-count"><CheckCircle2 size={14} /> {configuredResourceCount} of 4 configured</span></div>
            <div className="integration-resource-grid">
              <label className="integration-resource-card"><span className="integration-resource-icon analytics"><BarChart3 size={17} /></span><span className="integration-resource-copy"><span className="integration-resource-title">GA4 property <small>Analytics</small></span><span className="integration-resource-help">Traffic, engagement, and conversion data.</span><select value={ga4PropertyId} onChange={(event) => setGa4PropertyId(event.target.value)} disabled={!resources || busy}><option value="">Select a GA4 property</option>{!resources && ga4PropertyId ? <option value={ga4PropertyId}>{ga4PropertyId}</option> : null}{resources?.ga4Properties.map((property) => <option key={property.id} value={property.id}>{property.label} ({property.id})</option>)}</select></span></label>
              <label className="integration-resource-card"><span className="integration-resource-icon search"><Search size={17} /></span><span className="integration-resource-copy"><span className="integration-resource-title">Search Console site <small>Website GSC</small></span><span className="integration-resource-help">Search visibility and organic performance.</span><select value={gscSiteUrl} onChange={(event) => setGscSiteUrl(event.target.value)} disabled={!resources || busy}><option value="">Select a Search Console site</option>{!resources && gscSiteUrl ? <option value={gscSiteUrl}>{gscSiteUrl}</option> : null}{resources?.gscSites.map((site) => <option key={site.id} value={site.id}>{site.label}</option>)}</select></span></label>
              <label className="integration-resource-card"><span className="integration-resource-icon gbp"><MapPin size={17} /></span><span className="integration-resource-copy"><span className="integration-resource-title">GBP account <small>Local SEO</small></span><span className="integration-resource-help">Business Profile accounts and locations.</span><select value={gbpAccountId} onChange={(event) => { setGbpAccountId(event.target.value); setGbpLocationId(""); }} disabled={!resources || busy}><option value="">Select a GBP account</option>{!resources && gbpAccountId ? <option value={gbpAccountId}>{gbpAccountId}</option> : null}{resources?.gbpAccounts.map((account) => <option key={account.id} value={account.id}>{account.label}</option>)}</select></span></label>
              <label className="integration-resource-card"><span className="integration-resource-icon location"><Link2 size={17} /></span><span className="integration-resource-copy"><span className="integration-resource-title">GBP location <small>Local SEO</small></span><span className="integration-resource-help">The specific location used for reporting.</span><select value={gbpLocationId} onChange={(event) => setGbpLocationId(event.target.value)} disabled={!resources || !gbpAccountId || busy}><option value="">Select a GBP location</option>{!resources && gbpLocationId ? <option value={gbpLocationId}>{gbpLocationId}</option> : null}{resources?.gbpLocations.filter((location) => location.accountId === gbpAccountId).map((location) => <option key={location.id} value={location.id}>{location.label}</option>)}</select></span></label>
            </div>
            {!resources ? <div className="integration-discover-note"><Database size={15} /><span>Discover Google resources to unlock the selectors for this workspace.</span></div> : null}
            <div className="integration-resource-footer"><span>{selected.lastSyncedAt ? <><Clock3 size={14} /> Last synced {new Date(selected.lastSyncedAt).toLocaleString()}</> : <><Clock3 size={14} /> No sync recorded yet</>}</span><button className="button primary" type="button" onClick={saveConfiguration} disabled={!resources || busy}><CheckCircle2 size={14} /> Save resource selections</button></div>
          </div>
        </> : <div className="integration-disconnected-state"><span className="integration-disconnected-icon"><Link2 size={19} /></span><div><h3>Connect this workspace to Google</h3><p>Authorize the agency Google account to discover GA4, Search Console, and Business Profile resources.</p></div><a className="button primary" href={`/api/integrations/google/connect?clientId=${encodeURIComponent(selected.id)}`}>Connect Google</a></div>}

        {selected.lastErrorMessage ? <div className="integration-error-message"><ShieldCheck size={15} /><span>{selected.lastErrorMessage}</span></div> : null}
        {message ? <div className="integration-feedback"><CheckCircle2 size={15} /><span>{message}</span></div> : null}
      </section> : <section className="integration-empty-state card"><span className="integration-empty-icon"><Building2 size={20} /></span><div><h3>No client workspaces found</h3><p>Create a client workspace before configuring Google.</p></div></section>}
    </div>
  </AppShell>;
}
