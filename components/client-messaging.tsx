"use client";

import Link from "next/link";
import { ArrowUpRight, MessageCircle, ShieldCheck } from "lucide-react";

export function ClientMessaging() {
  return <section className="card client-messaging" id="communication"><div className="messaging-icon"><MessageCircle size={17} /></div><div className="messaging-copy"><p className="eyebrow">Client feedback</p><h2>Share feedback with the team</h2><p>Send a question, issue, request, or note about your client workspace.</p></div><Link className="button" href="/portal/feedback">Open feedback <ArrowUpRight size={14} /></Link><div className="messaging-readiness"><ShieldCheck size={16} /><span>Private to this client workspace</span></div></section>;
}
