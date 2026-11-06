"use client";

import Link from "next/link";
import Image from "next/image";
import { FormEvent, useState } from "react";
import { createAuthClient } from "@neon/auth/next";

const authClient = createAuthClient();

export function PasswordResetForm({ token }: { token?: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    setError("");
    if (token) {
      if (password.length < 8) {
        setError("Use at least 8 characters for your new password.");
        setPending(false);
        return;
      }
      if (password !== confirmation) {
        setError("Passwords do not match.");
        setPending(false);
        return;
      }
      const result = await authClient.resetPassword({ newPassword: password, token });
      if (result.error) setError(result.error.message || "We could not reset your password.");
      else setMessage("Your password has been updated. You can sign in now.");
    } else {
      const result = await authClient.requestPasswordReset({ email, redirectTo: `${window.location.origin}/auth/reset-password` });
      if (result.error) setError(result.error.message || "We could not send the reset email.");
      else setMessage("If an account exists for that email, a reset link has been sent.");
    }
    setPending(false);
  }

  return <main className="auth-page"><section className="auth-card"><div className="brand auth-brand"><Image className="auth-logo-image" src="/branding/ai-rankers/brand_logo.png" alt="The AI Rankers" width={183} height={59} priority /></div><p className="eyebrow">Account recovery</p><h1>{token ? "Choose a new password" : "Reset your password"}</h1><p className="auth-copy">{token ? "Set a new secure password for your The AI Rankers account." : "Enter your account email and we’ll send a secure password reset link."}</p><form onSubmit={submit} className="auth-form">{token ? <><label>New password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={8} required /></label><label>Confirm password<input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" minLength={8} required /></label></> : <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>}{error && <p className="auth-error" role="alert">{error}</p>}{message && <p className="auth-success" role="status">{message}</p>}{message && token ? <Link className="button primary auth-submit" href="/auth/sign-in">Go to sign in</Link> : <button className="button primary auth-submit" disabled={pending}>{pending ? token ? "Updating…" : "Sending…" : token ? "Update password" : "Send reset link"}</button>}</form><p className="auth-switch"><Link href="/auth/sign-in">Back to sign in</Link></p></section></main>;
}
