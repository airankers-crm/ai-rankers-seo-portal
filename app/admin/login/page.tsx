import { AuthForm } from "../../../components/auth-form";

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ redirectTo?: string }> }) {
  const params = await searchParams;
  return <AuthForm mode="sign-in" audience="admin" redirectTo={params.redirectTo || "/admin"} />;
}
