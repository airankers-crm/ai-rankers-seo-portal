import { redirect } from "next/navigation";

export default async function AdminClientImportCsvAlias({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/admin/clients/${id}?step=website#csv-import`);
}
