"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ChevronRight, CircleAlert, Clock3, Database, FilePlus2, Headphones, MessageCircle, Paperclip, Save, Send, ShieldCheck } from "lucide-react";

type RequestType = "QUESTION" | "ISSUE" | "REQUEST" | "DATA_UPDATE";
type FeedbackReply = { id: string; message: string; createdAt: string; authorName: string };
type RecentRequest = { id: string; category: "ISSUE" | "QUESTION" | "REQUEST" | "PRAISE"; status: "OPEN" | "REVIEWED" | "RESOLVED"; message: string; createdAt: string; replies: FeedbackReply[] };

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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function subjectFromMessage(message: string, fallback: string) {
  return message.split("\n")[0].replace(/^Subject:\s*/, "") || fallback;
}

export function PortalFeedbackPage({ recentRequests }: { recentRequests: RecentRequest[] }) {
  const [requests, setRequests] = useState(recentRequests);
  const [activeSection, setActiveSection] = useState<"new" | "history">(recentRequests.length ? "history" : "new");
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(recentRequests[0]?.id ?? null);
  const [requestType, setRequestType] = useState<RequestType>("QUESTION");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let timer: number | undefined;
    try {
      const stored = window.localStorage.getItem("ai-rankers-feedback-draft");
      if (!stored) return;
      const draft = JSON.parse(stored) as { requestType?: RequestType; subject?: string; message?: string; documentUrl?: string };
      timer = window.setTimeout(() => {
        if (draft.requestType && requestTypes.some((item) => item.value === draft.requestType)) setRequestType(draft.requestType);
        if (typeof draft.subject === "string") setSubject(draft.subject);
        if (typeof draft.message === "string") setMessage(draft.message);
        if (typeof draft.documentUrl === "string") setDocumentUrl(draft.documentUrl);
      }, 0);
    } catch {
      // A malformed or blocked local draft should not interrupt support access.
    }
    return () => { if (timer !== undefined) window.clearTimeout(timer); };
  }, []);

  function saveDraft() {
    try {
      window.localStorage.setItem("ai-rankers-feedback-draft", JSON.stringify({ requestType, subject, message, documentUrl }));
      setSaved(true);
      setSuccess("");
      setError("");
      window.setTimeout(() => setSaved(false), 2600);
    } catch {
      setError("Your browser blocked draft storage. You can still send the request now.");
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();
    if (!trimmedSubject || !trimmedMessage) {
      setError("Add a subject and message before sending.");
      return;
    }
    const trimmedDocumentUrl = documentUrl.trim();
    if (trimmedDocumentUrl) {
      try {
        const parsed = new URL(trimmedDocumentUrl);
        if (!new Set(["http:", "https:"]).has(parsed.protocol)) throw new Error("Unsupported URL");
      } catch {
        setError("Enter a valid https:// document link or leave it blank.");
        return;
      }
    }

    setPending(true);
    setError("");
    const category = requestType === "DATA_UPDATE" ? "REQUEST" : requestType;
    const composedMessage = `Subject: ${trimmedSubject}\n\n${trimmedMessage}${trimmedDocumentUrl ? `\n\nSupporting document: ${trimmedDocumentUrl}` : ""}`;
    const response = await fetch("/api/portal/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category,
        message: composedMessage,
        pagePath: "/portal/feedback",
        pageLabel: "Client feedback",
        context: { source: "Feedback page", requestType, documentUrl: trimmedDocumentUrl || null },
      }),
    }).catch(() => null);

    const body = await response?.json().catch(() => null);
    if (!response?.ok) {
      setError(body?.error || "Your message could not be sent. Please try again.");
      setPending(false);
      return;
    }

    setSubject("");
    setMessage("");
    setDocumentUrl("");
    window.localStorage.removeItem("ai-rankers-feedback-draft");
    const newRequest = { id: body?.feedback?.id ?? `local-${Date.now()}`, category: category as RecentRequest["category"], status: "OPEN" as const, message: composedMessage, createdAt: new Date().toISOString(), replies: [] };
    setRequests((current) => [newRequest, ...current]);
    setSelectedRequestId(newRequest.id);
    setActiveSection("history");
    setSuccess("Your message was sent to The AI Rankers team.");
    setPending(false);
  }

  const selectedRequest = requests.find((request) => request.id === selectedRequestId) ?? requests[0] ?? null;

  return <div className="feedback-page-shell">
    <nav className="feedback-section-nav" aria-label="Feedback navigation" role="tablist">
      <button type="button" role="tab" aria-selected={activeSection === "new"} className={activeSection === "new" ? "active" : ""} onClick={() => setActiveSection("new")}><MessageCircle size={15} /><span>New request</span><small>Contact support</small></button>
      <button type="button" role="tab" aria-selected={activeSection === "history"} className={activeSection === "history" ? "active" : ""} onClick={() => setActiveSection("history")}><Headphones size={15} /><span>Conversation history</span><small>{requests.length} {requests.length === 1 ? "conversation" : "conversations"}</small></button>
    </nav>

    {activeSection === "new" ? <div className="feedback-page-grid">
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

      <label className="feedback-document-field"><span>Supporting document <small>Optional</small></span><div><Paperclip size={16} /><input type="url" value={documentUrl} onChange={(event) => setDocumentUrl(event.target.value)} placeholder="https://drive.google.com/…" maxLength={500} /></div><small>Paste a secure share link. Binary file upload is not presented as available until storage is connected.</small></label>

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
        <div className="feedback-card-heading"><div className="feedback-card-icon purple"><FilePlus2 size={19} /></div><div><h2 id="recent-requests-title">Conversation history</h2><p>Open a conversation to see the full support thread.</p></div></div>
        {requests.length > 0 ? <div className="feedback-recent-list">{requests.slice(0, 4).map((request) => <button className={`feedback-recent-row${selectedRequestId === request.id ? " selected" : ""}`} type="button" key={request.id} onClick={() => { setSelectedRequestId(request.id); setActiveSection("history"); }}><div className="feedback-recent-copy"><strong>{subjectFromMessage(request.message, requestLabel(request.category))}</strong><span>{formatDate(request.createdAt)} · {requestLabel(request.category)}</span>{request.replies.length ? <small className="feedback-recent-response">{request.replies.length} support {request.replies.length === 1 ? "response" : "responses"}</small> : <small className="feedback-recent-awaiting">Waiting for a support response</small>}</div><span className={`feedback-status ${statusClass(request.status)}`}><span />{statusLabel(request.status)}</span><ChevronRight size={15} className="feedback-recent-arrow" /></button>)}</div> : <div className="feedback-recent-empty"><CheckCircle2 size={17} /><div><strong>No conversations yet</strong><span>Your submitted questions and updates will appear here.</span></div></div>}
        {requests.length > 4 ? <button type="button" className="feedback-see-all" onClick={() => setActiveSection("history")}>View all conversations <ChevronRight size={14} /></button> : null}
      </section>

      <div className="feedback-privacy-note"><ShieldCheck size={15} /><span>Your messages are private to this client workspace.</span></div>
    </aside>
  </div> : <section className="feedback-history-layout">
      <section className="card feedback-conversation-list" aria-labelledby="feedback-history-title">
        <div className="feedback-card-heading"><div className="feedback-card-icon purple"><Headphones size={19} /></div><div><h2 id="feedback-history-title">Your conversations</h2><p>Every message and support response for this workspace.</p></div></div>
        {requests.length ? <div className="feedback-history-items">{requests.map((request) => <button type="button" className={`feedback-history-item${selectedRequest?.id === request.id ? " selected" : ""}`} key={request.id} onClick={() => setSelectedRequestId(request.id)}><div><strong>{subjectFromMessage(request.message, requestLabel(request.category))}</strong><span>{formatDate(request.createdAt)} · {requestLabel(request.category)}</span></div><div><span className={`feedback-status ${statusClass(request.status)}`}><span />{statusLabel(request.status)}</span><ChevronRight size={15} /></div></button>)}</div> : <div className="feedback-recent-empty"><CheckCircle2 size={17} /><div><strong>No conversations yet</strong><span>Start a request and your support history will appear here.</span></div></div>}
        <button type="button" className="button primary feedback-history-new" onClick={() => setActiveSection("new")}><MessageCircle size={14} /> Start a new request</button>
      </section>

      {selectedRequest ? <article className="card feedback-conversation-detail" aria-labelledby="selected-feedback-title">
        <div className="feedback-conversation-detail-head"><div><p className="eyebrow">{requestLabel(selectedRequest.category)} · {formatDate(selectedRequest.createdAt)}</p><h2 id="selected-feedback-title">{subjectFromMessage(selectedRequest.message, requestLabel(selectedRequest.category))}</h2></div><span className={`feedback-status ${statusClass(selectedRequest.status)}`}><span />{statusLabel(selectedRequest.status)}</span></div>
        <div className="feedback-conversation-message"><span>Your message</span><p>{selectedRequest.message.replace(/^Subject:\s*[^\n]+\n?\n?/, "")}</p><time dateTime={selectedRequest.createdAt}>{formatDateTime(selectedRequest.createdAt)}</time></div>
        <div className="feedback-thread-heading"><span>Support thread</span><small>{selectedRequest.replies.length ? `${selectedRequest.replies.length} ${selectedRequest.replies.length === 1 ? "response" : "responses"}` : "Awaiting response"}</small></div>
        {selectedRequest.replies.length ? <div className="feedback-client-thread">{selectedRequest.replies.map((reply) => <div className="feedback-client-reply" key={reply.id}><div><strong>{reply.authorName} · Support team</strong><time dateTime={reply.createdAt}>{formatDateTime(reply.createdAt)}</time></div><p>{reply.message}</p></div>)}</div> : <div className="feedback-client-thread-empty"><Clock3 size={17} /><div><strong>Your request is in the support queue</strong><span>The AI Rankers team will reply here when there is an update.</span></div></div>}
      </article> : <article className="card feedback-conversation-detail feedback-conversation-placeholder"><Headphones size={24} /><h2>Select a conversation</h2><p>Choose a request from the list to see the complete message and support replies.</p></article>}
    </section>}
  </div>;
}
