import { redirect } from "next/navigation";

export default async function ClientAnalyticsAlias({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/admin/clients/${id}?step=analytics`);
}
