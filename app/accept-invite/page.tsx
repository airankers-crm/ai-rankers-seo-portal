import { redirect } from "next/navigation";

export default async function AcceptInviteAliasPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const params = await searchParams;
  redirect(params.token ? `/invite/${encodeURIComponent(params.token)}` : "/auth/sign-in");
}
