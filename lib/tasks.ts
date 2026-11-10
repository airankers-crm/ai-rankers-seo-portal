import { Prisma } from "@prisma/client";
import { prisma } from "@ai-rankers/db";

export type TaskDataRow = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  status: "TODO" | "IN_PROGRESS" | "DONE" | "CANCELED";
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  dueDate: Date | null;
  assigneeId: string | null;
  assigneeName: string | null;
};

export async function listClientTasks(clientId: string) {
  return prisma.$queryRaw<TaskDataRow[]>(Prisma.sql`SELECT t."id", t."title", t."description", t."category", t."status"::text AS "status", t."priority"::text AS "priority", t."dueDate", t."assigneeId", u."name" AS "assigneeName" FROM "Task" t LEFT JOIN "User" u ON u."id" = t."assigneeId" WHERE t."clientId" = ${clientId} AND t."clientVisible" = true ORDER BY CASE t."status"::text WHEN 'TODO' THEN 0 WHEN 'IN_PROGRESS' THEN 1 WHEN 'DONE' THEN 2 ELSE 3 END, t."dueDate" ASC NULLS LAST, t."createdAt" DESC LIMIT 100`);
}

export async function createClientTask(input: { clientId: string; title: string; description: string | null; category: string; priority: "LOW" | "NORMAL" | "HIGH" | "URGENT"; dueDate: Date | null; assigneeId: string | null; requesterId: string | null }) {
  const rows = await prisma.$queryRaw<TaskDataRow[]>(Prisma.sql`INSERT INTO "Task" ("id", "clientId", "title", "description", "category", "status", "priority", "dueDate", "assigneeId", "requesterId", "clientVisible", "createdAt", "updatedAt") VALUES (concat('task_', md5(random()::text || clock_timestamp()::text)), ${input.clientId}, ${input.title}, ${input.description}, ${input.category}, 'TODO'::"TaskStatus", ${input.priority}::"TaskPriority", ${input.dueDate}, ${input.assigneeId}, ${input.requesterId}, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING "id", "title", "description", "category", "status"::text AS "status", "priority"::text AS "priority", "dueDate", "assigneeId"`);
  return rows[0] ?? null;
}
