"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { createAuthClient } from "@neon/auth/next";

const authClient = createAuthClient();

export function SignOutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();

  async function signOut() {
    await authClient.signOut();
    router.push("/auth/sign-in");
    router.refresh();
  }

  return <button type="button" className={`profile-signout${compact ? " compact" : ""}`} aria-label="Sign out" title="Sign out" onClick={signOut}><LogOut size={13} /> {!compact && "Sign out"}</button>;
}
