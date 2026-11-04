"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function OnboardingForm({ email }: { email: string }) {
  const router = useRouter();
  const [businessName, setBusinessName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const response = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ businessName, websiteUrl }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null) as { error?: string } | null;
      setError(body?.error || "We could not create your workspace.");
      setPending(false);
      return;
    }

    router.push("/portal");
    router.refresh();
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="brand auth-brand"><div className="brand-mark">A</div><div><div className="brand-name">AI Rankers</div><span className="brand-sub">SEO intelligence</span></div></div>
        <p className="eyebrow">Workspace setup</p>
        <h1>Tell us about your business</h1>
        <p className="auth-copy">Signed in as {email}. Create your client workspace so we can show the right SEO performance data.</p>
        <form onSubmit={submit} className="auth-form">
          <label>Business name<input value={businessName} onChange={(event) => setBusinessName(event.target.value)} required /></label>
          <label>Website URL <span className="label-hint">optional</span><input type="url" value={websiteUrl} onChange={(event) => setWebsiteUrl(event.target.value)} placeholder="https://example.com" /></label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="button primary auth-submit" disabled={pending}>{pending ? "Creating…" : "Create workspace"}</button>
        </form>
      </section>
    </main>
  );
}
