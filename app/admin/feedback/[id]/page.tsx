import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, CircleAlert, ExternalLink, FileText, UserRound } from "lucide-react";
import { prisma } from "@ai-rankers/db";
import { AppShell } from "../../../../components/app-shell";
import { AdminFeedbackReply } from "../../../../components/admin-feedback-reply";
import { requireAdminAccess } from "../../../../lib/auth/access";

function categoryLabel(category: string) {
  return category === "ISSUE" ? "Issue" : category === "QUESTION" ? "Question" : category === "REQUEST" ? "Request" : "Praise";
}

function statusLabel(status: string) {
  return status === "OPEN" ? "Open" : status === "REVIEWED" ? "Reviewed" : "Resolved";
}

export default async function AdminFeedbackDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminAccess();
  const { id } = await params;
  const feedback = await prisma.feedback.findUnique({ where: { id }, include: { client: true, user: true, replies: { include: { author: { select: { name: true, email: true } } }, orderBy: { createdAt: "asc" } } } });
  if (!feedback) notFound();

  const contextText = feedback.context ? JSON.stringify(feedback.context, null, 2) : "";
  const statusTone = feedback.status === "RESOLVED" ? "complete" : feedback.status === "REVIEWED" ? "progress" : "neutral";

  return (
    <AppShell mode="admin" activeNav="Feedback">
      <div className="content">
        <div className="page-heading">
          <div>
            <Link className="back-link" href="/admin/feedback"><ArrowLeft size={13} /> Back to feedback</Link>
            <p className="eyebrow">Client feedback detail</p>
            <h1>{categoryLabel(feedback.category)} from {feedback.client.businessName}</h1>
            <p>Review the complete message, page context, and submitting client information.</p>
          </div>
          <span className={`status ${statusTone}`}>{statusLabel(feedback.status)}</span>
        </div>

        <div className="feedback-detail-grid">
          <article className="card panel feedback-detail-message-card">
            <div className="feedback-detail-heading"><div className="feedback-detail-icon"><CircleAlert size={18} /></div><div><p className="eyebrow">Submitted message</p><h2>Client note</h2></div></div>
            <div className="feedback-detail-message">{feedback.message}</div>
          </article>

          <aside className="card panel feedback-detail-meta-card">
            <div className="feedback-detail-heading"><div className="feedback-detail-icon teal"><FileText size={18} /></div><div><p className="eyebrow">Request context</p><h2>Details</h2></div></div>
            <dl className="feedback-detail-meta">
              <div><dt><UserRound size={13} /> Client</dt><dd>{feedback.client.businessName}</dd></div>
              <div><dt><UserRound size={13} /> Submitted by</dt><dd>{feedback.user.name || feedback.user.email}</dd></div>
              <div><dt><CalendarClock size={13} /> Received</dt><dd>{feedback.createdAt.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}</dd></div>
              <div><dt><FileText size={13} /> Submitted from</dt><dd>{feedback.pageLabel}<small>{feedback.pagePath}</small></dd></div>
            </dl>
            {contextText ? <details className="feedback-detail-context"><summary>View captured context</summary><pre>{contextText}</pre></details> : null}
            {feedback.pagePath.startsWith("/") ? <Link className="button" href={feedback.pagePath}><ExternalLink size={13} /> Open source page</Link> : null}
          </aside>
        </div>
        <AdminFeedbackReply feedbackId={feedback.id} initialReplies={feedback.replies.map((reply) => ({ id: reply.id, message: reply.message, createdAt: reply.createdAt.toISOString(), authorName: reply.author.name || reply.author.email }))} />
      </div>
    </AppShell>
  );
}
