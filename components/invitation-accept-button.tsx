"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function InvitationAcceptButton({ token }: { token: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function accept() {
    setPending(true);
    setError("");
    const response = await fetch(`/api/invitations/${token}/accept`, { method: "POST" });
    const body = await response.json().catch(() => null) as { error?: string; redirectTo?: string } | null;
    if (!response.ok) {
      setError(body?.error || "We could not accept this invitation.");
      setPending(false);
      return;
    }
    router.push(body?.redirectTo || "/portal");
    router.refresh();
  }

  return <div className="invite-action"><button className="button primary auth-submit" type="button" onClick={accept} disabled={pending}>{pending ? "Joining workspace…" : "Accept invitation"}</button>{error && <p className="auth-error" role="alert">{error}</p>}</div>;
}
