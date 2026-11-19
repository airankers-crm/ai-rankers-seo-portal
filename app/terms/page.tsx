import { AuthLegalPage } from "../../components/auth-legal-page";

export const dynamic = "force-static";

export default function TermsPage() {
  return <AuthLegalPage kind="terms" />;
}
