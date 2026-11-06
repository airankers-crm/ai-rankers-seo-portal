"use client";

import { MessageCircle, ShieldCheck, X } from "lucide-react";
import { useState } from "react";

export function ClientMessaging() {
  const [open, setOpen] = useState(false);
  return <section className="card client-messaging" id="communication"><div className="messaging-icon"><MessageCircle size={17} /></div><div className="messaging-copy"><p className="eyebrow">Client communication</p><h2>Report discussion</h2><p>Use a connected messaging provider for report questions, task decisions, and client messages.</p></div><button className="button" type="button" onClick={() => setOpen((current) => !current)}>{open ? "Close" : "Open messaging"}</button>{open && <div className="messaging-panel"><div className="messaging-panel-head"><strong>Messaging connection required</strong><button className="icon-button" type="button" aria-label="Close messaging" onClick={() => setOpen(false)}><X size={14} /></button></div><div className="messaging-readiness"><ShieldCheck size={16} /><div><strong>Provider not connected</strong><p>Connect Intercom, Zendesk, or another approved provider before sending messages. No message has been sent.</p></div></div></div>}</section>;
}
