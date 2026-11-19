"use client";

import { CheckCircle2, CircleAlert, Loader2, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Reply = { id: string; message: string; createdAt: string; authorName: string };

function formatReplyDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export function AdminFeedbackReply({ feedbackId, initialReplies }: { feedbackId: string; initialReplies: Reply[] }) {
  const router = useRouter();
  const [replies, setReplies] = useState(initialReplies);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) {
      setError("Write a response before sending.");
      return;
    }

    setPending(true);
    setError("");
    setSuccess("");
    const response = await fetch(`/api/admin/feedback/${feedbackId}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: trimmed }),
    }).catch(() => null);
    const body = await response?.json().catch(() => null) as { error?: string; reply?: { id: string; message: string; createdAt: string } } | null;
    if (!response?.ok || !body?.reply) {
      setError(body?.error ?? "The response could not be sent.");
      setPending(false);
      return;
    }

    setReplies((current) => [...current, { ...body.reply!, authorName: "You" }]);
    setMessage("");
    setSuccess("Response sent to the client portal.");
    setPending(false);
    router.refresh();
  }

  return (
    <section className="card panel feedback-reply-card" aria-labelledby="feedback-reply-title">
      <div className="feedback-detail-heading"><div className="feedback-detail-icon teal"><Send size={18} /></div><div><p className="eyebrow">Admin response</p><h2 id="feedback-reply-title">Reply to the client</h2><p>Responses are stored with this feedback thread and shown in the client portal.</p></div></div>
      {replies.length > 0 ? <div className="feedback-reply-thread">{replies.map((reply) => <article className="feedback-reply-bubble" key={reply.id}><div><strong>{reply.authorName}</strong><time dateTime={reply.createdAt}>{formatReplyDate(reply.createdAt)}</time></div><p>{reply.message}</p></article>)}</div> : <p className="feedback-reply-empty">No response has been sent yet.</p>}
      <form className="feedback-reply-form" onSubmit={submit}>
        <label><span>Response</span><textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={4000} rows={5} placeholder="Write a clear response for the client…" disabled={pending} /></label>
        {error ? <p className="form-error feedback-page-error"><CircleAlert size={14} /> {error}</p> : null}
        {success ? <p className="save-status feedback-page-success" role="status"><CheckCircle2 size={14} /> {success}</p> : null}
        <div className="feedback-reply-actions"><small>{message.length}/4000</small><button type="submit" className="button primary" disabled={pending || !message.trim()}>{pending ? <><Loader2 size={14} className="spin" /> Sending…</> : <><Send size={14} /> Send response</>}</button></div>
      </form>
    </section>
  );
}
