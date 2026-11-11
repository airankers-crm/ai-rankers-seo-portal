import { AdminSettings } from "../../../components/admin-settings";
import { requireAdminAccess } from "../../../lib/auth/access";
import { getWorkspaceSettings } from "../../../lib/admin-settings";

export default async function AdminSettingsPage() {
  const access = await requireAdminAccess();
  const settings = access.preview ? null : await getWorkspaceSettings();
  return <AdminSettings initialSettings={settings} preview={access.preview} />;
}
