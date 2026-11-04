import { ClientForm } from "../../../../components/client-form";
import { requireAdminAccess } from "../../../../lib/auth/access";

export const dynamic = "force-dynamic";

export default async function NewClientPage() {
  await requireAdminAccess();
  return <ClientForm />;
}
