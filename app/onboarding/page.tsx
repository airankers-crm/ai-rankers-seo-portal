import { redirect } from "next/navigation";
import { OnboardingForm } from "../../components/onboarding-form";
import { getCurrentAppUser } from "../../lib/auth/access";
import { getSession, isAuthConfigured } from "../../lib/auth/server";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  if (!isAuthConfigured()) redirect("/client/login?error=auth_configuration");
  const session = await getSession();
  if (!session?.user) redirect("/auth/sign-in?redirectTo=/onboarding");

  const user = await getCurrentAppUser();
  if (user?.clientId) redirect("/portal");

  return <OnboardingForm email={session.user.email} />;
}
