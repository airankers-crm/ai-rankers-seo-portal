import { PasswordResetForm } from "../../../components/password-reset-form";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const params = await searchParams;
  return <PasswordResetForm token={params.token} />;
}
