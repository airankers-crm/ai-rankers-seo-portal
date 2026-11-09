"use client";

import Link from "next/link";
import { ArrowUpRight, MessageCircle, ShieldCheck } from "lucide-react";

export function ClientMessaging() {
  return <section className="card client-messaging" id="communication"><div className="messaging-icon"><MessageCircle size={17} /></div><div className="messaging-copy"><p className="eyebrow">Client communication</p><h2>Talk with your support team</h2><p>Keep report questions, approvals, and document links with the AI Rankers team.</p></div><Link className="button" href="/portal/messages">Open conversation <ArrowUpRight size={14} /></Link><div className="messaging-readiness"><ShieldCheck size={16} /><span>Private to this client workspace</span></div></section>;
}
