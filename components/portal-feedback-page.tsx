"use client";

import { useState } from "react";
import { CheckCircle2, ChevronRight, CircleAlert, Clock3, Database, FilePlus2, Headphones, MessageCircle, Paperclip, Save, Send, ShieldCheck } from "lucide-react";

type RequestType = "QUESTION" | "ISSUE" | "REQUEST" | "DATA_UPDATE";
type RecentRequest = { id: string; category: "ISSUE" | "QUESTION" | "REQUEST" | "PRAISE"; status: "OPEN" | "REVIEWED" | "RESOLVED"; message: string; createdAt: string };

const requestTypes: Array<{ value: RequestType; label: string; icon: typeof MessageCircle }> = [
  { value: "QUESTION", label: "Question", icon: MessageCircle },
  { value: "ISSUE", label: "Issue", icon: CircleAlert },
  { value: "REQUEST", label: "Request", icon: FilePlus2 },
  { value: "DATA_UPDATE", label: "Data update", icon: Database },
];

function requestLabel(category: RecentRequest["category"]) {
  return category === "ISSUE" ? "Issue" : category === "QUESTION" ? "Question" : category === "PRAISE" ? "Feedback" : "Request";
}

function statusLabel(status: RecentRequest["status"]) {
  return status === "REVIEWED" ? "In progress" : status === "RESOLVED" ? "Resolved" : "Open";
}

function statusClass(status: RecentRequest["status"]) {
  return status === "REVIEWED" ? "in-progress" : status === "RESOLVED" ? "resolved" : "open";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

export function PortalFeedbackPage({ recentRequests }: { recentRequests: RecentRequest[] }) {
  const [requestType, setRequestType] = useState<RequestType>("QUESTION");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  function handleFile(file: File | null) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError("Please choose a file smaller than 10 MB.");
      return;
    }
    setError("");
    setAttachmentName(file.name);
  }

  function saveDraft() {
    setSaved(true);
    setSuccess("");
    setTimeout(() => setSaved(false), 2600);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();
    if (!trimmedSubject || !trimmedMessage) {
      setError("Add a subject and message before sending.");
      return;
    }

    setPending(true);
    setError("");
    const category = requestType === "DATA_UPDATE" ? "REQUEST" : requestType;
    const composedMessage = `Subject: ${trimmedSubject}\n\n${trimmedMessage}${attachmentName ? `\n\nAttachment reference: ${attachmentName}` : ""}`;
    const response = await fetch("/api/portal/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category,
        message: composedMessage,
        pagePath: "/portal/feedback",
        pageLabel: "Client feedback",
        context: { source: "Feedback page", requestType, attachmentName: attachmentName || null },
      }),
    }).catch(() => null);

    if (!response?.ok) {
      const body = await response?.json().catch(() => null);
      setError(body?.error || "Your message could not be sent. Please try again.");
      setPending(false);
      return;
    }

    setSubject("");
    setMessage("");
    setAttachmentName("");
    setSuccess("Your message was sent to The AI Rankers team.");
    setPending(false);
  }

  return <div className="feedback-page-grid">
    <form className="card feedback-composer" onSubmit={submit}>
      <div className="feedback-card-heading">
        <div className="feedback-card-icon purple"><MessageCircle size={19} /></div>
        <div><h2>Start a conversation</h2><p>Tell us what you need and we will route it to the right team.</p></div>
      </div>

      <fieldset className="feedback-request-fieldset">
        <legend>Request type</legend>
        <div className="feedback-request-grid">
          {requestTypes.map((item) => {
            const Icon = item.icon;
            return <button key={item.value} type="button" className={`feedback-request-choice${requestType === item.value ? " active" : ""}`} onClick={() => setRequestType(item.value)} aria-pressed={requestType === item.value}><Icon size={17} /><strong>{item.label}</strong></button>;
          })}
        </div>
      </fieldset>

      <label className="feedback-page-field"><span>Subject</span><input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="What can we help with?" maxLength={140} required /></label>
      <label className="feedback-page-field feedback-page-message"><span>Message</span><textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Tell us what you need help with" maxLength={2000} rows={6} required /><small>{message.length}/2000</small></label>

      <label className="feedback-upload" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); handleFile(event.dataTransfer.files[0] ?? null); }}>
        <input type="file" accept=".pdf,.png,.jpg,.jpeg,.csv,.doc,.docx" onChange={(event) => handleFile(event.target.files?.[0] ?? null)} />
        <span className="feedback-upload-icon"><Paperclip size={20} /></span>
        <span><strong>{attachmentName || "Attach a file"}</strong><small>{attachmentName ? "File reference will be included with your request" : "Drag and drop a file here, or click to browse"}</small></span>
      </label>

      {error ? <p className="form-error feedback-page-error"><CircleAlert size={14} /> {error}</p> : null}
      {success ? <p className="save-status feedback-page-success" role="status"><CheckCircle2 size={14} /> {success}</p> : null}
      <div className="feedback-page-actions"><button type="submit" className="button primary" disabled={pending}>{pending ? "Sending…" : <><Send size={14} /> Send message</>}</button><button type="button" className="button" onClick={saveDraft} disabled={pending}><Save size={14} /> {saved ? "Draft saved" : "Save draft"}</button><span className="feedback-security-note"><ShieldCheck size={14} /> Please do not share passwords or API keys.</span></div>
    </form>

    <aside className="feedback-page-side">
      <section className="card feedback-help-card">
        <div className="feedback-card-heading"><div className="feedback-card-icon teal"><Headphones size={19} /></div><div><h2>How can we help?</h2><p>We keep every request connected to your client workspace.</p></div></div>
        <div className="feedback-support-item teal"><Clock3 size={18} /><div><strong>Typical response within 1 business day</strong><span>We will follow up in the client portal.</span></div></div>
        <div className="feedback-support-item blue"><Clock3 size={18} /><div><strong>Support hours</strong><span>Mon - Fri, 9:00 AM - 5:00 PM (ET)</span></div></div>
      </section>

      <section className="card feedback-recent-card" aria-labelledby="recent-requests-title">
        <div className="feedback-card-heading"><div className="feedback-card-icon purple"><FilePlus2 size={19} /></div><div><h2 id="recent-requests-title">Your recent requests</h2><p>Follow up on questions sent from this workspace.</p></div></div>
        {recentRequests.length > 0 ? <div className="feedback-recent-list">{recentRequests.map((request) => <div className="feedback-recent-row" key={request.id}><div className="feedback-recent-copy"><strong>{request.message.split("\n")[0].replace(/^Subject:\s*/, "") || requestLabel(request.category)}</strong><span>{formatDate(request.createdAt)} · {requestLabel(request.category)}</span></div><span className={`feedback-status ${statusClass(request.status)}`}><span />{statusLabel(request.status)}</span><ChevronRight size={15} className="feedback-recent-arrow" /></div>)}</div> : <div className="feedback-recent-empty"><CheckCircle2 size={17} /><div><strong>No requests yet</strong><span>Your submitted questions and updates will appear here.</span></div></div>}
      </section>

      <div className="feedback-privacy-note"><ShieldCheck size={15} /><span>Your messages are private to this client workspace.</span></div>
    </aside>
  </div>;
}
