"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArrowUpRight,
  Info,
  Check,
  Link2,
  MessageCircle,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Plus,
  Search,
  Send,
  UsersRound,
  X,
} from "lucide-react";
import { AppShell } from "./app-shell";
import type { ChatGroupView, ChatMessageView } from "../lib/chat";

type ChatWorkspaceProps = {
  mode: "admin" | "client";
  groups: ChatGroupView[];
  initialMessages: ChatMessageView[];
  clients?: Array<{ id: string; businessName: string }>;
  clientName?: string;
  brandMark?: string | null;
  brandAccent?: string | null;
  participants?: Array<{ id: string; name: string; email: string; role: "SUPER_ADMIN" | "ADMIN" | "CLIENT"; clientId: string | null }>;
};

function initials(value: string) {
  return value.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "AR";
}

function formatTime(value: string | Date) {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

export function ChatWorkspace({ mode, groups: startingGroups, initialMessages, clients = [], clientName = "Tony Roofing", brandMark, brandAccent, participants = [] }: ChatWorkspaceProps) {
  const accent = brandAccent || "#f26b38";
  const [groups, setGroups] = useState(startingGroups);
  const [selectedId, setSelectedId] = useState(startingGroups[0]?.id ?? null);
  const [messages, setMessages] = useState(initialMessages);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [documentName, setDocumentName] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [showAttachment, setShowAttachment] = useState(false);
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [messageQuery, setMessageQuery] = useState("");
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [showGroupDetails, setShowGroupDetails] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupClientId, setGroupClientId] = useState(clients[0]?.id ?? "");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeGroup = useMemo(() => groups.find((group) => group.id === selectedId) ?? groups[0] ?? null, [groups, selectedId]);
  const filteredGroups = useMemo(() => groups.filter((group) => `${group.name} ${group.clientName} ${group.description ?? ""}`.toLowerCase().includes(query.toLowerCase())), [groups, query]);
  const activeClientName = activeGroup?.clientName ?? clientName;
  const visibleParticipants = useMemo(() => participants.filter((participant) => participant.role !== "CLIENT" || participant.clientId === activeGroup?.clientId), [activeGroup?.clientId, participants]);
  const visibleMessages = useMemo(() => {
    const normalizedQuery = messageQuery.trim().toLowerCase();
    return normalizedQuery ? messages.filter((message) => `${message.body} ${message.senderName} ${message.attachmentName ?? ""}`.toLowerCase().includes(normalizedQuery)) : messages;
  }, [messageQuery, messages]);

  async function loadMessages(groupId: string, silent = false) {
    if (!silent) setLoadingMessages(true);
    try {
      const response = await fetch(`/api/chat/groups/${encodeURIComponent(groupId)}/messages`, { cache: "no-store" });
      const body = await response.json().catch(() => null) as { messages?: ChatMessageView[]; error?: string } | null;
      if (!response.ok) throw new Error(body?.error || "Messages could not be loaded.");
      const nextMessages = body?.messages ?? [];
      setMessages(nextMessages);
      const latest = nextMessages[nextMessages.length - 1];
      setGroups((current) => current.map((group) => group.id === groupId ? { ...group, ...(latest ? { updatedAt: latest.createdAt, lastMessage: latest } : {}) } : group));
      setError(null);
    } catch (loadError) {
      if (!silent) setError(loadError instanceof Error ? loadError.message : "Messages could not be loaded.");
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  }

  useEffect(() => {
    if (!activeGroup) return;
    const timer = window.setInterval(() => void loadMessages(activeGroup.id, true), 30_000);
    return () => window.clearInterval(timer);
    // The selected group is the only changing external value for this poller.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroup?.id]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeGroup || (!draft.trim() && !documentUrl.trim()) || busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/chat/groups/${encodeURIComponent(activeGroup.id)}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: draft, attachmentName: documentName, attachmentUrl: documentUrl }),
      });
      const body = await response.json().catch(() => null) as { message?: ChatMessageView; error?: string } | null;
      if (!response.ok || !body?.message) throw new Error(body?.error || "Message could not be sent.");
      setMessages((current) => [...current, body.message!]);
      setGroups((current) => current.map((group) => group.id === activeGroup.id ? { ...group, updatedAt: body.message!.createdAt, lastMessage: body.message! } : group));
      setDraft("");
      setDocumentName("");
      setDocumentUrl("");
      setShowAttachment(false);
      setNotice("Message sent");
      window.setTimeout(() => setNotice(null), 2200);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Message could not be sent.");
    } finally {
      setBusy(false);
    }
  }

  async function createGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode !== "admin" || busy || !groupClientId || !groupName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/chat/groups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientId: groupClientId, name: groupName, description: groupDescription }) });
      const body = await response.json().catch(() => null) as { group?: ChatGroupView; error?: string } | null;
      if (!response.ok || !body?.group) throw new Error(body?.error || "Conversation could not be created.");
      setGroups((current) => [body.group!, ...current]);
      setSelectedId(body.group.id);
      setMessages([]);
      setGroupName("");
      setGroupDescription("");
      setShowGroupForm(false);
      setNotice("Conversation created");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Conversation could not be created.");
    } finally {
      setBusy(false);
    }
  }

  async function updateGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!activeGroup || busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/chat/groups/${encodeURIComponent(activeGroup.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: groupName, description: groupDescription }) });
      const body = await response.json().catch(() => null) as { group?: ChatGroupView; error?: string } | null;
      if (!response.ok || !body?.group) throw new Error(body?.error || "Conversation could not be updated.");
      setGroups((current) => current.map((group) => group.id === activeGroup.id ? { ...group, name: body.group!.name, description: body.group!.description, updatedAt: body.group!.updatedAt } : group));
      setShowGroupDetails(false);
      setNotice("Conversation updated");
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Conversation could not be updated.");
    } finally {
      setBusy(false);
    }
  }

  async function archiveGroup() {
    if (!activeGroup || busy || !window.confirm(`Archive ${activeGroup.name}?`)) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/chat/groups/${encodeURIComponent(activeGroup.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isArchived: true }) });
      if (!response.ok) throw new Error("Conversation could not be archived.");
      const remaining = groups.filter((group) => group.id !== activeGroup.id);
      setGroups(remaining);
      setSelectedId(remaining[0]?.id ?? null);
      setMessages([]);
      setNotice("Conversation archived");
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : "Conversation could not be archived.");
    } finally {
      setBusy(false);
    }
  }

  async function editMessage(messageId: string) {
    if (!editingBody.trim() || busy) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/chat/messages/${encodeURIComponent(messageId)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: editingBody }) });
      const body = await response.json().catch(() => null) as { message?: ChatMessageView; error?: string } | null;
      if (!response.ok || !body?.message) throw new Error(body?.error || "Message could not be updated.");
      setMessages((current) => current.map((message) => message.id === messageId ? body.message! : message));
      setEditingMessageId(null);
      setEditingBody("");
      setNotice("Message updated");
    } catch (editError) {
      setError(editError instanceof Error ? editError.message : "Message could not be updated.");
    } finally {
      setBusy(false);
    }
  }

  function openGroupDetails() {
    if (!activeGroup) return;
    setShowGroupMenu(false);
    setGroupName(activeGroup.name);
    setGroupDescription(activeGroup.description ?? "");
    setShowGroupDetails(true);
  }

  const shellMark = brandMark ?? (mode === "admin" ? "AR" : initials(activeClientName));
  return (
    <AppShell mode={mode === "admin" ? "admin" : "portal"} clientName={mode === "admin" ? "AI Rankers" : activeClientName} brandMark={shellMark} brandAccent={accent} activeNav={mode === "admin" ? "Client communication" : "Feedback"}>
      <div className="content team-communication-page chat-page">
        {error ? <div className="chat-alert error" role="alert"><X size={15} /> <span>{error}</span><button type="button" onClick={() => setError(null)} aria-label="Dismiss error"><X size={14} /></button></div> : null}
        {notice ? <div className="chat-alert success" role="status"><Check size={15} /> {notice}</div> : null}

        <section className="chat-workspace" aria-label="Client communication workspace">
          <aside className="chat-sidebar">
            <div className="chat-sidebar-head"><div><p className="eyebrow">Conversations</p><h2>{mode === "admin" ? "Client groups" : "Your groups"}</h2></div>{mode === "admin" ? <button className="chat-new-group" type="button" onClick={() => { setGroupClientId(clients[0]?.id ?? ""); setShowGroupForm(true); }}><Plus size={13} /> New group</button> : null}</div>
            <label className="chat-search"><Search size={14} /><span className="sr-only">Search conversations</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search conversations" /></label>
            <div className="chat-group-list">
              {filteredGroups.map((group) => <button type="button" key={group.id} className={`chat-group-row${group.id === activeGroup?.id ? " active" : ""}`} onClick={() => setSelectedId(group.id)}><span className="chat-group-avatar" style={{ backgroundColor: mode === "client" ? accent : "#2a195a" }}>{initials(mode === "client" ? group.name : group.clientName)}</span><span className="chat-group-copy"><strong>{group.name}</strong><small>{mode === "admin" ? group.clientName : group.description || "Client and support team"}</small>{group.lastMessage ? <em>{group.lastMessage.body || "Document shared"}</em> : null}</span><span className="chat-group-meta">{group.lastMessage ? formatTime(group.lastMessage.createdAt) : "New"}</span></button>)}
              {!filteredGroups.length ? <div className="chat-no-groups"><MessageCircle size={17} /><p>{groups.length ? "No groups match this search." : mode === "admin" ? "Create the first client group to start a secure conversation." : "Your support conversations will appear here."}</p></div> : null}
            </div>
            <div className="chat-sidebar-note"><UsersRound size={14} /><span>{mode === "admin" ? `${groups.length} active group${groups.length === 1 ? "" : "s"} across client workspaces` : "Your support team is available in this workspace"}</span></div>
          </aside>

          <section className="chat-conversation">
            {activeGroup ? <><div className="chat-conversation-head"><div className="chat-conversation-heading"><span className="chat-channel-icon" style={{ color: accent, backgroundColor: `${accent}18` }}><MessageCircle size={17} /></span><div><p className="eyebrow">{mode === "admin" ? activeGroup.clientName : "AI Rankers support"}</p><h2>{activeGroup.name}</h2><span>{activeGroup.description || "Client and support team"}</span></div></div><div className="chat-head-actions"><span className="chat-member-count"><UsersRound size={13} /> {mode === "admin" ? "Support + client" : "Private group"}</span><button className="icon-button" type="button" aria-label="Search this conversation" aria-pressed={showMessageSearch} onClick={() => setShowMessageSearch((current) => !current)}><Search size={15} /></button><button className="icon-button" type="button" aria-label="Open group information" aria-pressed={showGroupInfo} onClick={() => { setShowGroupMenu(false); setShowGroupInfo(true); }}><Info size={15} /></button>{mode === "admin" ? <div className="chat-menu-wrap"><button className="icon-button" type="button" aria-label="Conversation actions" aria-expanded={showGroupMenu} onClick={() => setShowGroupMenu((current) => !current)}><MoreHorizontal size={16} /></button>{showGroupMenu ? <div className="chat-group-menu"><button type="button" onClick={openGroupDetails}><Pencil size={13} /> Edit group</button><button type="button" onClick={() => { setShowGroupMenu(false); void archiveGroup(); }}><Archive size={13} /> Archive group</button></div> : null}</div> : null}</div></div>
              {showMessageSearch ? <div className="chat-message-search"><Search size={14} /><input autoFocus value={messageQuery} onChange={(event) => setMessageQuery(event.target.value)} placeholder="Search messages in this group" /><button type="button" onClick={() => { setMessageQuery(""); setShowMessageSearch(false); }} aria-label="Close message search"><X size={14} /></button></div> : null}
              <div className="chat-message-body" aria-live="polite">
                {loadingMessages && !messages.length ? <div className="chat-loading"><span /><span /><span /> Loading conversation</div> : null}
                {!loadingMessages && messages.length > 0 && !visibleMessages.length ? <div className="chat-empty"><div className="chat-empty-icon"><Search size={21} /></div><h3>No matching messages</h3><p>Try another word or clear the conversation search.</p></div> : null}
                {!loadingMessages && !messages.length ? <div className="chat-empty"><div className="chat-empty-icon"><MessageCircle size={21} /></div><h3>Start the conversation</h3><p>Use this group for report questions, approvals, delivery decisions, and secure document links.</p></div> : null}
                {visibleMessages.map((message) => { const mine = mode === "admin" ? message.senderRole !== "CLIENT" : message.senderRole === "CLIENT"; return <div className={`chat-message-row${mine ? " mine" : ""}`} key={message.id}><span className="chat-avatar" style={{ backgroundColor: mine ? accent : "#2a195a" }}>{initials(message.senderName)}</span><div className="chat-message-stack"><div className="chat-message-meta"><strong>{message.senderName}</strong><span>{message.senderRole === "CLIENT" ? "Client" : "AI Rankers support"} · {formatTime(message.createdAt)}{message.editedAt ? " · edited" : ""}</span>{mine ? <button type="button" className="chat-edit-link" onClick={() => { setEditingMessageId(message.id); setEditingBody(message.body); }}><Pencil size={11} /> Edit</button> : null}</div>{editingMessageId === message.id ? <div className="chat-edit-box"><textarea value={editingBody} onChange={(event) => setEditingBody(event.target.value)} aria-label="Edit message" /><div><button className="button" type="button" onClick={() => { setEditingMessageId(null); setEditingBody(""); }}>Cancel</button><button className="button primary" type="button" onClick={() => void editMessage(message.id)} disabled={busy}>Save</button></div></div> : <div className="chat-bubble"><p>{message.body}</p>{message.attachmentUrl ? <a href={message.attachmentUrl} target="_blank" rel="noreferrer" className="chat-attachment"><Link2 size={14} /><span><strong>{message.attachmentName || "Shared document"}</strong><small>Open document</small></span><ArrowUpRight size={13} /></a> : null}</div>}</div></div>; })}
              </div>
              <form className="chat-composer" onSubmit={sendMessage}><div className="chat-composer-main"><textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder="Write a message…" aria-label="Write a message" rows={1} /><div className="chat-composer-actions"><button type="button" className={`chat-attach-button${showAttachment ? " active" : ""}`} onClick={() => setShowAttachment((current) => !current)}><Paperclip size={14} /> Attach</button><span>Enter to send · Shift + Enter for a new line</span></div></div><button className="button primary chat-send-button" type="submit" disabled={busy || (!draft.trim() && !documentUrl.trim())}><Send size={14} /> Send</button></form>
              {showAttachment ? <div className="chat-attachment-form"><label>Document name<input value={documentName} onChange={(event) => setDocumentName(event.target.value)} placeholder="SEO report — November 2026" /></label><label>Secure document link<input type="url" value={documentUrl} onChange={(event) => setDocumentUrl(event.target.value)} placeholder="https://…" /></label><small>V1 stores a secure document link. Binary file upload will be connected with object storage.</small></div> : null}
            </> : <div className="chat-no-selection"><MessageCircle size={22} /><h2>Select a client group</h2><p>{mode === "admin" ? "Choose a client conversation or create a new group." : "Your client conversations will appear here."}</p></div>}
          </section>

        </section>
      </div>

      {showGroupInfo && activeGroup ? <div className="chat-info-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowGroupInfo(false); }}><aside className="chat-info-drawer" aria-label="Group information"><div className="chat-info-head"><div><p className="eyebrow">Group information</p><h2>{activeGroup.name}</h2><span>{activeClientName}</span></div><button type="button" className="icon-button" onClick={() => setShowGroupInfo(false)} aria-label="Close group information"><X size={16} /></button></div><div className="chat-info-hero" style={{ backgroundColor: `${accent}18`, color: accent }}><MessageCircle size={26} /></div><div className="chat-info-section"><p className="eyebrow">Description</p><p className="chat-info-description">{activeGroup.description || "Client and support team conversation"}</p><small>Created {formatDate(activeGroup.createdAt)}</small></div><div className="chat-info-section"><div className="chat-info-section-title"><p className="eyebrow">Participants</p><span>{visibleParticipants.length || 2}</span></div><div className="chat-participant-list">{visibleParticipants.length ? visibleParticipants.map((participant) => <div className="chat-participant" key={participant.id}><span className="chat-avatar" style={{ backgroundColor: participant.role === "CLIENT" ? accent : "#2a195a" }}>{initials(participant.name)}</span><span><strong>{participant.name}</strong><small>{participant.role === "CLIENT" ? "Client member" : "AI Rankers support"}</small></span>{participant.role !== "CLIENT" ? <em>Admin</em> : null}</div>) : <div className="chat-participant"><span className="chat-avatar" style={{ backgroundColor: "#2a195a" }}>AR</span><span><strong>AI Rankers support</strong><small>Authorized support team</small></span><em>Admin</em></div>}</div></div>{mode === "admin" ? <div className="chat-info-actions"><button type="button" className="button" onClick={openGroupDetails}><Pencil size={13} /> Edit group</button><button type="button" className="chat-control-button danger" onClick={() => { setShowGroupInfo(false); void archiveGroup(); }}><Archive size={14} /> Archive group</button></div> : null}</aside></div> : null}
      {showGroupForm ? <div className="chat-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowGroupForm(false); }}><form className="chat-modal" onSubmit={createGroup}><div className="chat-modal-head"><div><p className="eyebrow">Admin workspace</p><h2>Create client group</h2><p>Start a private conversation for one client and their support team.</p></div><button type="button" className="icon-button" onClick={() => setShowGroupForm(false)} aria-label="Close"><X size={16} /></button></div><label>Client<select value={groupClientId} onChange={(event) => setGroupClientId(event.target.value)}>{clients.map((client) => <option key={client.id} value={client.id}>{client.businessName}</option>)}</select></label><label>Group name<input value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="SEO delivery" maxLength={80} required /></label><label>Description<textarea value={groupDescription} onChange={(event) => setGroupDescription(event.target.value)} placeholder="Reports, approvals, and delivery decisions" maxLength={180} rows={3} /></label><div className="chat-modal-foot"><span>Only authorized users in this client workspace can access it.</span><button className="button primary" type="submit" disabled={busy}><Plus size={14} /> Create group</button></div></form></div> : null}
      {showGroupDetails && activeGroup ? <div className="chat-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowGroupDetails(false); }}><form className="chat-modal" onSubmit={updateGroup}><div className="chat-modal-head"><div><p className="eyebrow">{activeGroup.clientName}</p><h2>Edit group details</h2><p>Changes apply to this client’s communication workspace.</p></div><button type="button" className="icon-button" onClick={() => setShowGroupDetails(false)} aria-label="Close"><X size={16} /></button></div><label>Group name<input value={groupName} onChange={(event) => setGroupName(event.target.value)} maxLength={80} required /></label><label>Description<textarea value={groupDescription} onChange={(event) => setGroupDescription(event.target.value)} maxLength={180} rows={3} /></label><div className="chat-modal-foot"><span>Conversation history is preserved.</span><button className="button primary" type="submit" disabled={busy}><Check size={14} /> Save changes</button></div></form></div> : null}
    </AppShell>
  );
}
