"use client";

import { CheckCircle2, History, RotateCcw, Send, ShieldCheck } from "lucide-react";
import { useState } from "react";

type PortalVersion = { id: string; version: number; label: string | null; publishedAt: string };

export function ClientPublishControls({ clientId, versions: initialVersions, draftMetricCount, draftSectionCount }: { clientId: string; versions: PortalVersion[]; draftMetricCount: number; draftSectionCount: number }) {
  const [versions, setVersions] = useState(initialVersions);
  const [label, setLabel] = useState("Approved portal update");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState<"publish" | string | null>(null);

  async function publishPortal() {
    setPending("publish");
    setMessage("");
    setError("");
    try {
      const response = await fetch(`/api/admin/clients/${clientId}/versions`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ label }) });
      const body = await response.json().catch(() => null) as { error?: string; version?: PortalVersion } | null;
      if (!response.ok || !body?.version) {
        setError(body?.error ?? "The portal version could not be published.");
        return;
      }
      setVersions((current) => [body.version!, ...current]);
      setMessage(`Version ${body.version.version} is now published to the client portal.`);
    } catch {
      setError("The portal version could not be published. Check the connection and try again.");
    } finally {
      setPending(null);
    }
  }

  async function rollback(version: PortalVersion) {
    if (!window.confirm(`Roll the client portal back to version ${version.version}?`)) return;
    setPending(version.id);
    setMessage("");
    setError("");
    try {
      const response = await fetch(`/api/admin/clients/${clientId}/versions/${version.id}/rollback`, { method: "POST" });
      const body = await response.json().catch(() => null) as { error?: string; version?: PortalVersion } | null;
      if (!response.ok || !body?.version) {
        setError(body?.error ?? "The portal version could not be restored.");
        return;
      }
      setVersions((current) => [body.version!, ...current]);
      setMessage(`Version ${body.version.version} restored the portal state from version ${version.version}.`);
      window.setTimeout(() => window.location.reload(), 700);
    } catch {
      setError("The portal version could not be restored. Check the connection and try again.");
    } finally {
      setPending(null);
    }
  }

  return <section className="card panel client-publish-controls" aria-labelledby="client-publish-title">
    <div className="panel-heading"><div><p className="eyebrow">Release management</p><h2 id="client-publish-title">Publish client portal</h2><p>Review the draft state, release one approved version, and restore an earlier presentation when needed.</p></div><Send size={18} color="#f26b38" /></div>
    <div className="publish-status-grid"><div><strong>{draftMetricCount}</strong><span>draft metrics</span></div><div><strong>{draftSectionCount}</strong><span>draft sections</span></div><div><strong>{versions.length}</strong><span>saved versions</span></div><div className="publish-safety"><ShieldCheck size={14} /><span>Client sees published data only</span></div></div>
    {message && <p className="save-status section-feedback" role="status"><CheckCircle2 size={14} /> {message}</p>}
    {error && <p className="auth-error section-feedback" role="alert">{error}</p>}
    <div className="publish-action-row"><label>Release label<input value={label} maxLength={100} onChange={(event) => setLabel(event.target.value)} /></label><button className="button primary" type="button" onClick={() => void publishPortal()} disabled={pending !== null}><Send size={13} /> {pending === "publish" ? "Publishing…" : "Publish approved changes"}</button></div>
    <div className="version-history"><div className="version-history-heading"><div><strong>Version history</strong><span>Published portal snapshots</span></div><History size={15} /></div>{versions.length ? versions.map((version) => <div className="version-row" key={version.id}><div><strong>Version {version.version}</strong><span>{version.label || "Portal update"}</span></div><time dateTime={version.publishedAt}>{new Date(version.publishedAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}</time><button className="table-action" type="button" onClick={() => void rollback(version)} disabled={pending !== null}><RotateCcw size={12} /> {pending === version.id ? "Restoring…" : "Restore"}</button></div>) : <p className="version-empty">No published versions yet. Publish the first approved portal state above.</p>}</div>
  </section>;
}
