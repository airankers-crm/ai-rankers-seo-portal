import type { DemoActivity } from "@ai-rankers/core";
import { demoActivities, demoClient } from "@ai-rankers/core";
import { prisma } from "@ai-rankers/db";
import { ActivityCenter } from "../../../components/activity-center";
import type { ClientTask } from "../../../components/client-task-center";
import { listClientTasks } from "../../../lib/tasks";
import { requirePortalAccess } from "../../../lib/auth/access";

export const dynamic = "force-dynamic";

export default async function ActivitiesPage() {
  const access = await requirePortalAccess();
  const client = await prisma.client.findUnique({
    where: access.user?.clientId ? { id: access.user.clientId } : { slug: "riverstone-dental" },
    include: { activities: { orderBy: { createdAt: "desc" } } },
  });

  if (!client) return <ActivityCenter businessName={demoClient.businessName} activities={demoActivities} />;

  const activities: DemoActivity[] = client.activities.map((activity) => ({
    id: activity.id,
    title: activity.title,
    category: activity.category,
    date: activity.completedAt?.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) ?? "In progress",
    status: activity.status === "COMPLETED" ? "COMPLETED" : "IN_PROGRESS",
  }));

  const tasks: ClientTask[] = (await listClientTasks(client.id)).map((task) => ({ id: task.id, title: task.title, description: task.description, category: task.category, status: task.status, priority: task.priority, dueDate: task.dueDate?.toISOString() ?? null, assignee: task.assigneeName ? { name: task.assigneeName } : null }));
  return <ActivityCenter businessName={client.businessName} brandMark={client.brandMark} brandAccent={client.brandAccent} activities={activities} tasks={tasks} />;
}
