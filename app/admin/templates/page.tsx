import { AdminReportTemplate } from "../../../components/admin-report-template";
import { requireAdminAccess } from "../../../lib/auth/access";

export default async function AdminTemplatesPage() { await requireAdminAccess(); return <AdminReportTemplate />; }
