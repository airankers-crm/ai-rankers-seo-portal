import { AuthForm } from "../../../components/auth-form";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ redirectTo?: string }> }) {
  const params = await searchParams;
  return <AuthForm mode="sign-in" redirectTo={params.redirectTo || "/portal"} />;
}
