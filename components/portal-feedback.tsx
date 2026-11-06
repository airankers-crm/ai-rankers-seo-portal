"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, CircleAlert, MessageSquarePlus, Send, X } from "lucide-react";

type FeedbackCategory = "ISSUE" | "QUESTION" | "REQUEST" | "PRAISE";

const categories: Array<{ value: FeedbackCategory; label: string; description: string }> = [
  { value: "ISSUE", label: "Something looks wrong", description: "Report a data, display, or workflow issue." },
  { value: "QUESTION", label: "I have a question", description: "Ask about a metric, report, or delivery item." },
  { value: "REQUEST", label: "Request a change", description: "Suggest an improvement to your workspace." },
  { value: "PRAISE", label: "Looks good", description: "Tell the team what is working well." },
];

type PortalFeedbackProps = {
  pagePath: string;
  pageLabel: string;
  context?: Record<string, string | number | boolean | null | undefined>;
};

export function PortalFeedback({ pagePath, pageLabel, context }: PortalFeedbackProps) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<FeedbackCategory>("ISSUE");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) setOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, pending]);

  function reset() {
    setOpen(false);
    setMessage("");
    setCategory("ISSUE");
    setError(null);
    setSubmitted(false);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      setError("Tell us what you would like the team to know.");
      return;
    }

    setPending(true);
    setError(null);
    const response = await fetch("/api/portal/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, message: trimmedMessage, pagePath, pageLabel, context }),
    }).catch(() => null);

    if (!response?.ok) {
      const body = await response?.json().catch(() => null);
      setError(body?.error || "Feedback could not be sent. Please try again.");
      setPending(false);
      return;
    }

    setSubmitted(true);
    setPending(false);
  }

  return <>
    <section className="portal-feedback card" aria-labelledby="portal-feedback-heading">
      <div className="portal-feedback-icon"><MessageSquarePlus size={17} /></div>
      <div className="portal-feedback-copy"><strong id="portal-feedback-heading">Help us improve your workspace</strong><span>Share a question, issue, or idea with the agency team.</span></div>
      <button type="button" className="button" onClick={() => { setOpen(true); setSubmitted(false); setError(null); }}>Share feedback</button>
    </section>

    {open ? <div className="modal-backdrop" role="presentation" onClick={() => { if (!pending) setOpen(false); }}>
      <section className="report-modal feedback-modal" role="dialog" aria-modal="true" aria-labelledby="portal-feedback-modal-title" onClick={(event) => event.stopPropagation()}>
        {submitted ? <div className="feedback-success"><div className="feedback-success-icon"><CheckCircle2 size={20} /></div><div><p className="eyebrow">Feedback received</p><h2 id="portal-feedback-modal-title">Thanks for helping us improve.</h2><p>Your note was saved with the {pageLabel.toLowerCase()} context so the team can follow up with the right details.</p></div><div className="modal-actions"><button type="button" className="button primary" onClick={reset}>Done</button></div></div> : <form onSubmit={submit}>
          <div className="modal-heading"><div><p className="eyebrow">{pageLabel}</p><h2 id="portal-feedback-modal-title">Share feedback</h2><p>Your message goes to the agency team with this page context attached.</p></div><button ref={closeButtonRef} type="button" className="icon-button" aria-label="Close feedback dialog" onClick={() => setOpen(false)} disabled={pending}><X size={16} /></button></div>
          <fieldset className="feedback-category-fieldset"><legend>What kind of feedback is this?</legend><div className="feedback-category-grid">{categories.map((item) => <button key={item.value} type="button" className={`feedback-category${category === item.value ? " active" : ""}`} onClick={() => setCategory(item.value)} aria-pressed={category === item.value}><strong>{item.label}</strong><span>{item.description}</span></button>)}</div></fieldset>
          <label className="feedback-message-field"><span>Your feedback</span><textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Tell us what you noticed or what would make this easier to use…" maxLength={2000} rows={5} required /><small>{message.length}/2000</small></label>
          {error ? <p className="form-error feedback-error"><CircleAlert size={14} /> {error}</p> : null}
          <div className="modal-actions"><button type="button" className="button" onClick={() => setOpen(false)} disabled={pending}>Cancel</button><button type="submit" className="button primary" disabled={pending || !message.trim()}>{pending ? "Sending…" : <><Send size={14} /> Send feedback</>}</button></div>
        </form>}
      </section>
    </div> : null}
  </>;
}
