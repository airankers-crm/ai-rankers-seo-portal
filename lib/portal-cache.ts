import { revalidatePath, revalidateTag } from "next/cache";

/** Invalidate every client-facing report after an admin changes its data source or values. */
export function revalidateClientPortal(clientId: string) {
  revalidateTag(`portal-overview:${clientId}`, { expire: 0 });
  revalidateTag(`portal-gbp:${clientId}`, { expire: 0 });
  revalidatePath("/portal");
  revalidatePath("/portal/website-seo");
  revalidatePath("/portal/analytics");
  revalidatePath("/portal/gbp");
}
