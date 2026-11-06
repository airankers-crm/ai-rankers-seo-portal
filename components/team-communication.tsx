"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Bell,
  Check,
  FileText,
  Link2,
  ListTodo,
  MessageCircle,
  Paperclip,
  Plus,
  Send,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { AppShell } from "./app-shell";

type TeamCommunicationProps = {
  businessName: string;
  brandMark?: string | null;
  brandAccent?: string;
};

const teamMembers = [
  { initials: "JM", name: "Jordan Mitchell", role: "Account lead", tone: "purple" },
  { initials: "AR", name: "Alex Rivera", role: "SEO strategist", tone: "orange" },
  { initials: "TS", name: "Taylor Smith", role: "Content partner", tone: "teal" },
];

export function TeamCommunication({ businessName, brandMark, brandAccent }: TeamCommunicationProps) {
  const mark = brandMark ?? businessName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const [connectionRequested, setConnectionRequested] = useState(false);

  return (
    <AppShell mode="portal" clientName={businessName} brandMark={mark} brandAccent={brandAccent ?? "#F26B38"} activeNav="Team communication">
      <div className="content team-communication-page">
        <header className="team-page-header">
          <div>
            <p className="eyebrow">Client portal / Team communication</p>
            <div className="team-title-row">
              <h1>Team communication</h1>
              <span className="team-status-pill"><span className="team-status-dot" /> Messaging provider required</span>
            </div>
            <p>Report questions, task decisions, and client-visible discussion for {businessName}.</p>
          </div>
          <button className="button primary team-new-thread" type="button" onClick={() => setConnectionRequested(true)}><Plus size={15} /> New thread</button>
        </header>

        <section className="team-connect-bar" aria-live="polite">
          <div className="team-connect-icon"><ShieldCheck size={18} /></div>
          <div className="team-connect-copy">
            <strong>{connectionRequested ? "Connection request ready" : "Messaging connection not configured"}</strong>
            <p>{connectionRequested ? "Your request is saved for the workspace owner. Messaging will unlock once an approved provider is connected." : "Connect an approved provider before sending messages. This workspace does not send external messages."}</p>
          </div>
          {connectionRequested ? <span className="team-requested"><Check size={14} /> Requested</span> : <button className="button primary" type="button" onClick={() => setConnectionRequested(true)}>Connect messaging <ArrowUpRight size={14} /></button>}
        </section>

        <section className="team-workspace" aria-label="Team communication workspace">
          <aside className="team-rail">
            <div className="team-rail-heading"><div><p className="eyebrow">Conversations</p><h2>Team threads</h2></div><button className="icon-button" type="button" aria-label="Start a new thread" onClick={() => setConnectionRequested(true)}><Plus size={15} /></button></div>
            <button className="team-thread active" type="button"><span className="team-thread-icon" style={{ backgroundColor: brandAccent ?? "#F26B38" }}>{mark}</span><span className="team-thread-copy"><strong>SEO delivery</strong><small>Reports, tasks, and delivery records</small></span><span className="team-thread-state">Draft</span></button>
            <div className="team-rail-empty"><MessageCircle size={16} /><p>Connected report and task threads will appear here.</p></div>
            <div className="team-rail-note"><Bell size={14} /><span>Notifications stay inside this workspace until messaging is connected.</span></div>
          </aside>

          <section className="team-conversation">
            <div className="team-conversation-head"><div className="team-conversation-title"><span className="team-channel-mark"><MessageCircle size={16} /></span><div><p className="eyebrow">SEO delivery</p><h2>{businessName} · Agency team</h2><span>Report questions and task decisions</span></div></div><span className="team-access"><UsersRound size={13} /> Team access</span></div>
            <div className="team-conversation-body">
              <div className="team-message-date">Today</div>
              <div className="team-message muted-message"><span className="team-avatar avatar-purple">AR</span><div><div className="team-message-meta"><strong>Alex Rivera</strong><span>SEO strategist · 9:42 AM</span></div><p>SEO delivery updates and decisions will be shared here once messaging is connected.</p></div></div>
              <div className="team-message muted-message"><span className="team-avatar avatar-orange">{mark}</span><div><div className="team-message-meta"><strong>{businessName}</strong><span>Client workspace</span></div><p>Use this thread for report questions, approvals, and client-visible discussion.</p></div></div>
              <div className="team-empty-card"><div className="team-empty-icon"><Link2 size={20} /></div><h3>Connect messaging to start collaborating</h3><p>Messages, attachments, and participant history will appear in this thread after an approved provider is connected.</p><button className="button" type="button" onClick={() => setConnectionRequested(true)}>{connectionRequested ? "Connection requested" : "Request connection"}</button></div>
            </div>
            <div className="team-composer"><textarea aria-label="Message" disabled placeholder="Messaging is unavailable until a provider is connected…" /><button className="icon-button" type="button" aria-label="Attach file" disabled><Paperclip size={15} /></button><button className="button primary" type="button" disabled><Send size={14} /> Send</button></div>
          </section>

          <aside className="team-context">
            <div className="team-context-section"><p className="eyebrow">Related records</p><h2>Workspace records</h2><Link className="team-record" href="/portal/reports"><span className="team-record-icon"><FileText size={15} /></span><span><strong>Latest report</strong><small>October SEO performance report</small></span><ArrowUpRight size={13} /></Link><Link className="team-record" href="/portal/activities"><span className="team-record-icon"><ListTodo size={15} /></span><span><strong>Open tasks</strong><small>Request and track work in Activities</small></span><ArrowUpRight size={13} /></Link><Link className="button team-context-button" href="/portal/activities">Open task workspace</Link></div>
            <div className="team-context-section team-members-section"><div className="team-context-title"><p className="eyebrow">Participants</p><span>3 people</span></div><div className="team-members">{teamMembers.map((member) => <div className="team-member" key={member.initials}><span className={`team-avatar avatar-${member.tone}`}>{member.initials}</span><span><strong>{member.name}</strong><small>{member.role}</small></span></div>)}</div></div>
          </aside>
        </section>
      </div>
    </AppShell>
  );
}
