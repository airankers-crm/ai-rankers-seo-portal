"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function ClientForm() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    const response = await fetch("/api/admin/clients", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ businessName, websiteUrl, contactEmail }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null) as { error?: string } | null;
      setError(body?.error || "We could not create this client workspace.");
      setPending(false);
      return;
    }

    const body = await response.json() as { id: string };
    router.push(`/admin/clients/${body.id}`);
    router.refresh();
  }

  return (
    <div className="content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">The AI Rankers / Operations</p>
          <h1>Add a client workspace</h1>
          <p>Create the workspace first. You can connect data sources, invite users, and publish dashboard sections as the client setup progresses.</p>
        </div>
        <Link className="button" href="/admin">Cancel</Link>
      </div>
      <section className="card panel form-panel">
        <div className="panel-heading"><div><h2>Workspace details</h2><p>These details are used in the portal header and client directory.</p></div></div>
        <form className="workspace-form" onSubmit={submit}>
          <label>Business name<input value={businessName} onChange={(event) => setBusinessName(event.target.value)} placeholder="Tony Roofing" required /></label>
          <label>Website URL <span className="label-hint">optional</span><input type="url" value={websiteUrl} onChange={(event) => setWebsiteUrl(event.target.value)} placeholder="https://example.com" /></label>
          <label>Primary contact email <span className="label-hint">optional</span><input type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} placeholder="client@example.com" /></label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <div className="form-actions"><Link className="button" href="/admin">Back</Link><button className="button primary" disabled={pending}>{pending ? "Creating…" : "Create workspace"}</button></div>
        </form>
      </section>
    </div>
  );
}
