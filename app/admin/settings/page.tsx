import { AdminSettings } from "../../../components/admin-settings";
import { requireAdminAccess } from "../../../lib/auth/access";

export default async function AdminSettingsPage() { await requireAdminAccess(); return <AdminSettings />; }
