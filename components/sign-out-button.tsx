"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { createAuthClient } from "@neon/auth/next";

const authClient = createAuthClient();

export function SignOutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();

  async function signOut() {
    await authClient.signOut();
    const adminSession = window.location.pathname === "/admin" || window.location.pathname.startsWith("/admin/");
    router.push(adminSession ? "/admin/login" : "/client/login");
    router.refresh();
  }

  return <button type="button" className={`profile-signout${compact ? " compact" : ""}`} aria-label="Sign out" title="Sign out" onClick={signOut}><LogOut size={13} /><span className="profile-signout-label">Sign out</span></button>;
}
