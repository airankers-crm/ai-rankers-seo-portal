"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Building2, ShieldCheck, UserRound } from "lucide-react";
import { createAuthClient } from "@neon/auth/next";

const authClient = createAuthClient();

type AuthAudience = "client" | "admin";

type AccessResult = {
  destination: string;
  isAdmin: boolean;
};

const audienceContent = {
  client: {
    eyebrow: "Client portal",
    title: "Sign in to your client portal",
    description: "Access approved reports, shared SEO activity, goals, and team communication for your business.",
    contextTitle: "A clear view of your SEO work.",
    contextCopy: "Review performance, follow agreed priorities, and keep requests with your agency team in one secure place.",
    alternateLabel: "AI Rankers team member?",
    alternateHref: "/admin/login",
    alternateAction: "Administrator sign in",
    icon: UserRound,
  },
  admin: {
    eyebrow: "Agency workspace",
    title: "Administrator sign in",
    description: "Use your approved AI Rankers team account to manage clients, reporting operations, and portal access.",
    contextTitle: "Operate every client workspace securely.",
    contextCopy: "Manage client access, reports, goals, and service activity from the internal AI Rankers workspace.",
    alternateLabel: "Looking for your client portal?",
    alternateHref: "/client/login",
    alternateAction: "Client sign in",
    icon: ShieldCheck,
  },
} as const;

export function AuthForm({
  mode,
  redirectTo,
  audience = "client",
}: {
  mode: "sign-in" | "sign-up";
  redirectTo: string;
  audience?: AuthAudience;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const isSignIn = mode === "sign-in";
  const content = audienceContent[audience];
  const AudienceIcon = content.icon;

  async function resolveDestination() {
    const response = await fetch(`/api/auth/redirect?redirectTo=${encodeURIComponent(redirectTo)}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Your account was verified, but we could not confirm workspace access. Please sign in again.");
    }

    return (await response.json()) as AccessResult;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    try {
      const result = isSignIn
        ? await authClient.signIn.email({ email, password })
        : await authClient.signUp.email({ name, email, password });

      if (result.error) {
        setError(result.error.message || "We could not complete that request.");
        return;
      }

      const access = await resolveDestination();

      if (audience === "admin" && !access.isAdmin) {
        await authClient.signOut();
        setError("This account does not have AI Rankers administrator access. Use the client portal sign-in instead.");
        return;
      }

      router.replace(access.destination);
      router.refresh();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "We could not complete that request. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className={`auth-page auth-page-${audience}`}>
      <section className="auth-layout" aria-labelledby="auth-title">
        <section className="auth-card auth-entry-card">
          <Link className="auth-logo" href="/" aria-label="AI Rankers home">
            <span className="auth-logo-mark"><Building2 size={18} strokeWidth={2.25} /></span>
            <span><strong>AI Rankers</strong><small>SEO intelligence</small></span>
          </Link>

          <div className="auth-heading">
            <span className="auth-audience-label"><AudienceIcon size={13} /> {content.eyebrow}</span>
            <h1 id="auth-title">{isSignIn ? content.title : "Create your client portal account"}</h1>
            <p>{isSignIn ? content.description : "Create a secure account to access the AI Rankers client portal."}</p>
          </div>

          <form onSubmit={submit} className="auth-form">
            {!isSignIn && (
              <label>
                Full name
                <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required />
              </label>
            )}
            <label>
              Work email
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" autoFocus required />
            </label>
            <label>
              Password
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={isSignIn ? "current-password" : "new-password"} minLength={8} required />
            </label>
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button className="button primary auth-submit" disabled={pending} aria-busy={pending}>
              {pending ? "Checking access…" : isSignIn ? "Sign in securely" : "Create client account"}
            </button>
          </form>

          {isSignIn && (
            <Link className="auth-recovery" href={`/auth/reset-password?redirectTo=${encodeURIComponent(audience === "admin" ? "/admin/login" : "/client/login")}`}>
              Forgot your password?
            </Link>
          )}

          {audience === "client" && (
            <p className="auth-switch">
              {isSignIn ? "Need a client portal account?" : "Already have an account?"}{" "}
              <Link href={`${isSignIn ? "/auth/sign-up" : "/client/login"}?redirectTo=${encodeURIComponent(redirectTo)}`}>
                {isSignIn ? "Create one" : "Sign in"}
              </Link>
            </p>
          )}

          {isSignIn && (
            <p className="auth-alternate">
              {content.alternateLabel} <Link href={content.alternateHref}>{content.alternateAction}</Link>
            </p>
          )}
        </section>

        <aside className="auth-context" aria-label={`${content.eyebrow} information`}>
          <div className="auth-context-top"><AudienceIcon size={18} /><span>{content.eyebrow}</span></div>
          <div>
            <h2>{content.contextTitle}</h2>
            <p>{content.contextCopy}</p>
          </div>
          <div className="auth-context-points">
            <span>Secure access</span>
            <span>Role-based workspace</span>
            <span>Built for agency collaboration</span>
          </div>
        </aside>
      </section>
    </main>
  );
}
