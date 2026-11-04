import { AuthForm } from "../../../components/auth-form";

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ redirectTo?: string }> }) {
  const params = await searchParams;
  return <AuthForm mode="sign-up" redirectTo={params.redirectTo || "/onboarding"} />;
}
