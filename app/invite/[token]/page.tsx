import Link from "next/link";
import Image from "next/image";
import { createHash } from "node:crypto";
import { prisma } from "@ai-rankers/db";
import { getSession } from "../../../lib/auth/server";
import { InvitationAcceptButton } from "../../../components/invitation-accept-button";

export const dynamic = "force-dynamic";

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const invitation = await prisma.clientInvitation.findUnique({ where: { tokenHash }, include: { client: { select: { businessName: true, brandAccent: true } } } });
  const valid = invitation?.status === "PENDING" && invitation.expiresAt > new Date();
  const session = await getSession();

  return (
    <main className="auth-page">
      <section className="auth-card invite-card">
        <div className="brand auth-brand"><Image className="auth-logo-image" src="/branding/ai-rankers/brand_logo.png" alt="The AI Rankers" width={183} height={59} priority /></div>
        {valid ? <>
          <p className="eyebrow">Workspace invitation</p>
          <h1>Join {invitation.client.businessName}</h1>
          <p className="auth-copy">You’ve been invited to view the client presentation dashboard and SEO reporting workspace.</p>
          <div className="invite-summary"><span>Invited email</span><strong>{invitation.email}</strong><span>Invitation expires</span><strong>{invitation.expiresAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</strong></div>
          {session ? <InvitationAcceptButton token={token} /> : <Link className="button primary auth-submit" href={`/auth/sign-in?redirectTo=${encodeURIComponent(`/invite/${token}`)}`}>Sign in to continue</Link>}
          {!session && <p className="auth-switch">New to AI Rankers? <Link href={`/auth/sign-up?redirectTo=${encodeURIComponent(`/invite/${token}`)}`}>Create your account</Link></p>}
        </> : <>
          <p className="eyebrow">Invitation unavailable</p>
          <h1>This link is no longer active.</h1>
          <p className="auth-copy">Ask your AI Rankers administrator to send a new invitation link.</p>
          <Link className="button auth-submit" href="/auth/sign-in">Go to sign in</Link>
        </>}
      </section>
    </main>
  );
}
