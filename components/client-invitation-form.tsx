"use client";

import { Copy, MailPlus, Send } from "lucide-react";
import { FormEvent, useState } from "react";

export function ClientInvitationForm({ clientId }: { clientId: string }) {
  const [email, setEmail] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setStatus("");
    setError("");
    setInviteUrl("");
    const response = await fetch(`/api/admin/clients/${clientId}/invitations`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
    const body = await response.json().catch(() => null) as { error?: string; invitation?: { inviteUrl: string } } | null;
    if (!response.ok || !body?.invitation) {
      setError(body?.error || "We could not create the invitation.");
      setPending(false);
      return;
    }
    setInviteUrl(body.invitation.inviteUrl);
    setStatus("Invitation link ready to copy");
    setEmail("");
    setPending(false);
  }

  async function copyInvite() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setStatus("Copied to clipboard");
  }

  return <div className="invite-form"><div className="invite-form-heading"><div className="list-icon"><MailPlus size={15} /></div><div><strong>Invite a client stakeholder</strong><p>Create a secure seven-day link to this workspace. Email delivery can be connected after SMTP is configured.</p></div></div><form onSubmit={submit} className="inline-form"><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="stakeholder@client.com" aria-label="Stakeholder email" required /><button className="button primary" type="submit" disabled={pending}><Send size={13} />{pending ? "Creating…" : "Create invite"}</button></form>{inviteUrl && <div className="invite-link-row"><input value={inviteUrl} readOnly aria-label="Invitation link" /><button className="button" type="button" onClick={copyInvite}><Copy size={13} /> Copy link</button></div>}<p className={`save-status${error ? " error-text" : ""}`}>{error || status}</p></div>;
}
