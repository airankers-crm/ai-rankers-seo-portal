import { prisma } from "@ai-rankers/db";
import { AdminOperationsPage, type AdminOperationDetail } from "../../../components/admin-operations";
import { requireAdminAccess } from "../../../lib/auth/access";

function categoryLabel(category: string) {
  return category === "ISSUE" ? "Issue" : category === "QUESTION" ? "Question" : category === "REQUEST" ? "Request" : "Praise";
}

function statusLabel(status: string) {
  return status === "OPEN" ? "Open" : status === "REVIEWED" ? "Reviewed" : "Resolved";
}

export default async function AdminFeedbackPage() {
  await requireAdminAccess();
  const feedback = await prisma.feedback.findMany({ include: { client: true, user: true, replies: { include: { author: { select: { name: true, email: true } } }, orderBy: { createdAt: "asc" } } }, orderBy: { createdAt: "desc" }, take: 100 });
  const rows = feedback.map((item) => ({ id: item.id, category: categoryLabel(item.category), message: item.message.length > 100 ? `${item.message.slice(0, 97)}…` : item.message, client: item.client.businessName, page: item.pageLabel, status: statusLabel(item.status), received: item.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) }));
  const detailPanel: Record<string, AdminOperationDetail> = Object.fromEntries(feedback.map((item) => [item.id, {
    eyebrow: "Client feedback detail",
    title: `${categoryLabel(item.category)} from ${item.client.businessName}`,
    status: { label: statusLabel(item.status), tone: item.status === "RESOLVED" ? "complete" : item.status === "REVIEWED" ? "progress" : "neutral" },
    message: item.message,
    metadata: [
      { label: "Client", value: item.client.businessName },
      { label: "Submitted by", value: item.user.name, detail: item.user.email },
      { label: "Received", value: item.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }), detail: item.createdAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) },
      { label: "Submitted from", value: item.pageLabel, detail: item.pagePath },
    ],
    context: item.context ? JSON.stringify(item.context, null, 2) : null,
    reply: { endpoint: `/api/admin/feedback/${item.id}/reply`, initialReplies: item.replies.map((reply) => ({ id: reply.id, message: reply.message, createdAt: reply.createdAt.toISOString(), authorName: reply.author.name ?? reply.author.email })) },
  }]));
  return <AdminOperationsPage config={{ activeNav: "Feedback", title: "Client feedback", description: "Review client questions, issues, and requests with the workspace context attached.", sourceLabel: "Portal feedback inbox", sourceDescription: "Feedback is stored with the submitting client, user, page context, and a sanitized snapshot of the active view. This inbox is available to Admin and Super Admin roles.", showContext: false, columns: [{ key: "category", label: "Type" }, { key: "message", label: "Feedback" }, { key: "client", label: "Client" }, { key: "page", label: "Page" }, { key: "status", label: "Status" }, { key: "received", label: "Received" }], rows, filters: [{ key: "status", label: "Status", options: ["Open", "Reviewed", "Resolved"] }, { key: "category", label: "Type", options: ["Issue", "Question", "Request", "Praise"] }], rowAction: { label: "View details", hrefPrefix: "/admin/feedback/", drawer: true }, detailPanel, emptyTitle: "No client feedback yet", emptyDescription: "Feedback submitted from the client portal will appear here with the page context attached.", secondaryAction: { label: "Workspace overview", href: "/admin" } }} />;
}
