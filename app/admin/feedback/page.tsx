import { prisma } from "@ai-rankers/db";
import { AdminOperationsPage } from "../../../components/admin-operations";
import { requireAdminAccess } from "../../../lib/auth/access";

function categoryLabel(category: string) {
  return category === "ISSUE" ? "Issue" : category === "QUESTION" ? "Question" : category === "REQUEST" ? "Request" : "Praise";
}

function statusLabel(status: string) {
  return status === "OPEN" ? "Open" : status === "REVIEWED" ? "Reviewed" : "Resolved";
}

export default async function AdminFeedbackPage() {
  await requireAdminAccess();
  const feedback = await prisma.feedback.findMany({ include: { client: true, user: true }, orderBy: { createdAt: "desc" }, take: 100 });
  const rows = feedback.map((item) => ({ id: item.id, category: categoryLabel(item.category), message: item.message.length > 100 ? `${item.message.slice(0, 97)}…` : item.message, client: item.client.businessName, page: item.pageLabel, status: statusLabel(item.status), received: item.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) }));
  return <AdminOperationsPage config={{ activeNav: "Feedback", title: "Client feedback", description: "Review contextual notes submitted from client workspaces and keep the follow-up queue visible to the agency team.", sourceLabel: "Portal feedback inbox", sourceDescription: "Feedback is stored with the submitting client, user, page context, and a sanitized snapshot of the active view.", columns: [{ key: "category", label: "Type" }, { key: "message", label: "Feedback" }, { key: "client", label: "Client" }, { key: "page", label: "Page" }, { key: "status", label: "Status" }, { key: "received", label: "Received" }], rows, filters: [{ key: "status", label: "Status", options: ["Open", "Reviewed", "Resolved"] }, { key: "category", label: "Type", options: ["Issue", "Question", "Request", "Praise"] }], emptyTitle: "No client feedback yet", emptyDescription: "Feedback submitted from the client portal will appear here with the page context attached.", primaryAction: { label: "Open client portal", href: "/portal" } }} />;
}
