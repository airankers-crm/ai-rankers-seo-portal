import { AuthForm } from "../../../components/auth-form";

export default async function ClientLoginPage({ searchParams }: { searchParams: Promise<{ redirectTo?: string }> }) {
  const params = await searchParams;
  return <AuthForm mode="sign-in" audience="client" redirectTo={params.redirectTo || "/portal"} />;
}
