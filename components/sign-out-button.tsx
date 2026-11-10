"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { createAuthClient } from "@neon/auth/next";

const authClient = createAuthClient();

export function SignOutButton({ compact = false, variant = "profile" }: { compact?: boolean; variant?: "profile" | "topbar" | "menu" }) {
  const router = useRouter();

  async function signOut() {
    await authClient.signOut();
    const adminSession = window.location.pathname === "/admin" || window.location.pathname.startsWith("/admin/");
    router.push(adminSession ? "/admin/login" : "/client/login");
    router.refresh();
  }

  return <button type="button" className={`profile-signout${variant === "topbar" ? " topbar-signout" : ""}${variant === "menu" ? " menu-signout" : ""}${compact ? " compact" : ""}`} aria-label="Sign out" title="Sign out" onClick={signOut}><LogOut size={13} /><span className={variant === "menu" ? "menu-signout-label" : "profile-signout-label"}>Sign out</span></button>;
}
