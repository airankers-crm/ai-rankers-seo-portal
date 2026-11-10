import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@ai-rankers/db";
import { AppShell } from "../../../components/app-shell";
import { UserManagement } from "../../../components/user-management";
import { requireAdminAccess } from "../../../lib/auth/access";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  await requireAdminAccess();
  const [users, clients] = await Promise.all([
    prisma.user.findMany({ orderBy: [{ status: "asc" }, { name: "asc" }], include: { client: { select: { id: true, businessName: true } } } }),
    prisma.client.findMany({ orderBy: { businessName: "asc" }, select: { id: true, businessName: true } }),
  ]);

  return <AppShell mode="admin" activeNav="Users"><div className="content"><div className="page-heading"><div><Link className="back-link" href="/admin"><ArrowLeft size={13} /> Back to workspace overview</Link><h1>Users and access</h1></div></div><UserManagement initialUsers={users.map(({ id, email, name, role, status, client }) => ({ id, email, name, role, status, client }))} clients={clients} /></div></AppShell>;
}
