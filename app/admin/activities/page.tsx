import { redirect } from "next/navigation";
import { requireAdminAccess } from "../../../lib/auth/access";

export default async function AdminActivitiesPage() {
  await requireAdminAccess();
  redirect("/admin/clients");
}
