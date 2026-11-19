"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { AlertCircle, Eye, EyeOff, Loader2, LockKeyhole, Mail, ShieldCheck, UserRound } from "lucide-react";
import { createAuthClient } from "@neon/auth/next";
import { BinaryOrbitsBackground } from "./binary-orbits-background";

const authClient = createAuthClient();

function friendlyAuthError(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("invalid") && (normalized.includes("credential") || normalized.includes("password") || normalized.includes("email"))) return "The email or password could not be verified. Check your details and try again.";
  if (normalized.includes("too many") || normalized.includes("rate limit") || normalized.includes("try again later")) return "There have been too many attempts. Please wait a few minutes or reset your password.";
  if (normalized.includes("already") && normalized.includes("exist")) return "An account with this email already exists. Try signing in instead.";
  return message;
}

type AuthAudience = "client" | "admin";

type AccessResult = {
  destination: string;
  isAdmin: boolean;
};

const audienceContent = {
  client: {
    eyebrow: "Client portal",
    title: "Sign in to your client portal",
    description: "Access approved reports, shared SEO activity, and goals for your business.",
    contextTitle: "A clear view of your SEO work.",
    contextCopy: "Review performance, follow agreed priorities, and keep requests with your agency team in one secure place.",
    alternateLabel: "The AI Rankers team member?",
    alternateHref: "/admin/login",
    alternateAction: "Administrator sign in",
    points: ["Private client access", "Role-based workspace", "Built for agency collaboration"],
    icon: UserRound,
  },
  admin: {
    eyebrow: "Agency workspace",
    title: "Administrator sign in",
    description: "Use your authorized agency account to manage clients, reporting operations, and portal access.",
    contextTitle: "Operate every client workspace securely.",
    contextCopy: "Manage client access, reports, goals, and service activity from the internal agency workspace.",
    alternateLabel: "Looking for your client portal?",
    alternateHref: "/client/login",
    alternateAction: "Client sign in",
    points: ["Client access control", "Reporting operations", "Agency workspace controls"],
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
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, setPending] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [rippleKey, setRippleKey] = useState(0);

  const isSignIn = mode === "sign-in";
  const content = audienceContent[audience];
  const AudienceIcon = content.icon;
  const emailInvalid = emailTouched && email.length > 0 && !/^\S+@\S+\.\S+$/.test(email);
  const passwordInvalid = passwordTouched && password.length > 0 && password.length < 8;

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
    setSuccess("");
    setRippleKey((current) => current + 1);

    try {
      const result = isSignIn
        ? await authClient.signIn.email({ email, password })
        : await authClient.signUp.email({ name, email, password });

      if (result.error) {
        setError(friendlyAuthError(result.error.message || "We could not complete that request."));
        return;
      }

      const access = await resolveDestination();

      if (audience === "admin" && !access.isAdmin) {
        await authClient.signOut();
        setError("This account does not have administrator access. Use the client portal sign-in instead.");
        return;
      }

      setSuccess(audience === "admin" ? "Access confirmed. Opening the agency workspace…" : "Access confirmed. Opening your client portal…");
      await new Promise((resolve) => window.setTimeout(resolve, 360));
      router.replace(access.destination);
      router.refresh();
    } catch (submissionError) {
      setError(friendlyAuthError(submissionError instanceof Error ? submissionError.message : "We could not complete that request. Please try again."));
    } finally {
      setPending(false);
    }
  }

  return (
    <main className={`auth-page auth-page-${audience}`}>
      <section className="auth-layout" aria-labelledby="auth-title">
        <section className="auth-card auth-entry-card">
          <Link className="auth-logo" href="/" aria-label="The AI Rankers home">
            <Image className="auth-logo-image" src="/branding/ai-rankers/brand_logo.png" alt="The AI Rankers" width={183} height={59} priority />
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
            <div className="auth-field">
              <label htmlFor="auth-email">Work email</label>
              <div className="auth-input-wrap">
                <Mail size={16} aria-hidden="true" />
                <input id="auth-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} onBlur={() => setEmailTouched(true)} autoComplete="email" autoFocus required aria-invalid={emailInvalid} aria-describedby={emailInvalid ? "auth-email-error" : undefined} />
              </div>
              {emailInvalid ? <p className="auth-field-error" id="auth-email-error"><AlertCircle size={12} /> Enter a valid work email.</p> : null}
            </div>
            <div className="auth-field">
              <div className="auth-field-heading">
                <label htmlFor="auth-password">Password</label>
                {isSignIn && (
                  <button className="auth-password-toggle" type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Hide password" : "Show password"}>
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    {showPassword ? "Hide" : "Show"}
                  </button>
                )}
              </div>
              <div className="auth-input-wrap">
                <LockKeyhole size={16} aria-hidden="true" />
                <input id="auth-password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} onBlur={() => { setPasswordTouched(true); setCapsLockOn(false); }} onKeyDown={(event) => setCapsLockOn(event.getModifierState("CapsLock"))} onKeyUp={(event) => setCapsLockOn(event.getModifierState("CapsLock"))} autoComplete={isSignIn ? "current-password" : "new-password"} minLength={8} required aria-invalid={passwordInvalid} aria-describedby={capsLockOn ? "auth-password-caps" : passwordInvalid ? "auth-password-error" : undefined} />
              </div>
              {capsLockOn ? <p className="auth-field-hint warning" id="auth-password-caps">Caps Lock is on.</p> : null}
              {passwordInvalid ? <p className="auth-field-error" id="auth-password-error"><AlertCircle size={12} /> Use at least 8 characters.</p> : null}
            </div>
            {error && <p className="auth-error" role="alert">{error}</p>}
            {success ? <p className="auth-success" role="status">{success}</p> : null}
            <button className="button primary auth-submit" disabled={pending} aria-busy={pending}>
              {pending ? <><Loader2 className="auth-submit-spinner" size={15} /> Checking access…</> : isSignIn ? "Sign in securely" : "Create client account"}
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

          <div className="auth-support-links" aria-label="Login support">
            <a href="mailto:support@theairankers.com">Contact support</a>
            <span aria-hidden="true">·</span>
            <Link href="/privacy">Privacy policy</Link>
            <span aria-hidden="true">·</span>
            <Link href="/terms">Terms of service</Link>
          </div>
        </section>

        <aside className="auth-context" aria-label={`${content.eyebrow} information`}>
          <BinaryOrbitsBackground rippleKey={rippleKey} />
          <div className="auth-context-top"><AudienceIcon size={18} /><span>{content.eyebrow}</span></div>
          <div className="auth-context-copy">
            <h2>{content.contextTitle}</h2>
            <p>{content.contextCopy}</p>
          </div>
          <div className="auth-context-points">
            {content.points.map((point) => <span key={point}>{point}</span>)}
          </div>
        </aside>
      </section>
    </main>
  );
}
