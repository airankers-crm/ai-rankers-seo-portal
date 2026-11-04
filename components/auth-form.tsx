"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { createAuthClient } from "@neon/auth/next";

const authClient = createAuthClient();

export function AuthForm({ mode, redirectTo }: { mode: "sign-in" | "sign-up"; redirectTo: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    const result = mode === "sign-in"
      ? await authClient.signIn.email({ email, password })
      : await authClient.signUp.email({ name, email, password });

    if (result.error) {
      setError(result.error.message || "We could not complete that request.");
      setPending(false);
      return;
    }

    router.push(redirectTo || "/portal");
    router.refresh();
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="brand auth-brand"><div className="brand-mark">A</div><div><div className="brand-name">AI Rankers</div><span className="brand-sub">SEO intelligence</span></div></div>
        <p className="eyebrow">{mode === "sign-in" ? "Welcome back" : "Get started"}</p>
        <h1>{mode === "sign-in" ? "Sign in to your workspace" : "Create your workspace account"}</h1>
        <p className="auth-copy">Use your AI Rankers account to view client performance, reports, and SEO progress.</p>
        <form onSubmit={submit} className="auth-form">
          {mode === "sign-up" && <label>Name<input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required /></label>}
          <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
          <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "sign-in" ? "current-password" : "new-password"} minLength={8} required /></label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="button primary auth-submit" disabled={pending}>{pending ? "Working…" : mode === "sign-in" ? "Sign in" : "Create account"}</button>
        </form>
        <p className="auth-switch">{mode === "sign-in" ? "New to AI Rankers?" : "Already have an account?"} <Link href={`${mode === "sign-in" ? "/auth/sign-up" : "/auth/sign-in"}?redirectTo=${encodeURIComponent(redirectTo)}`}>{mode === "sign-in" ? "Create an account" : "Sign in"}</Link></p>
      </section>
    </main>
  );
}
