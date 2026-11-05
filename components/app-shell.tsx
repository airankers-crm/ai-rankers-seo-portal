"use client";

import Link from "next/link";
import { useState } from "react";
import { SignOutButton } from "./sign-out-button";
import {
  Activity,
  BarChart3,
  Building2,
  FileText,
  LayoutDashboard,
  Menu,
  Settings2,
  UsersRound,
  X,
} from "lucide-react";

type AppShellProps = {
  children: React.ReactNode;
  mode: "portal" | "admin";
  clientName?: string;
  brandMark?: string;
  brandAccent?: string;
  activeNav?: string;
};

const portalNav = [
  { label: "Overview", href: "/portal", icon: LayoutDashboard },
  { label: "Website SEO", href: "/portal#website", icon: BarChart3 },
  { label: "GBP performance", href: "/portal#gbp", icon: Building2 },
  { label: "Activities", href: "/portal/activities", icon: Activity },
  { label: "Reports", href: "/portal#reports", icon: FileText },
];

const adminNav = [
  { label: "Workspace overview", href: "/admin", icon: LayoutDashboard },
  { label: "Clients", href: "/admin#clients", icon: UsersRound },
  { label: "Users", href: "/admin/users", icon: UsersRound },
  { label: "Dashboard builder", href: "/admin#builder", icon: Settings2 },
  { label: "Audit activity", href: "/admin#audit", icon: Activity },
];

export function AppShell({ children, mode, clientName, brandMark, brandAccent, activeNav }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const nav = mode === "admin" ? adminNav : portalNav;
  const clientInitials = clientName?.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "CL";

  return (
    <div className="app-shell">
      <aside className={`sidebar${mobileOpen ? " open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">A</div>
          <div>
            <div className="brand-name">AI Rankers</div>
            <span className="brand-sub">SEO intelligence</span>
          </div>
        </div>

        <div className="nav-label">{mode === "admin" ? "Operations" : "Your workspace"}</div>
        <nav className="nav-list" aria-label="Primary navigation">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.label} className={`nav-item${item.label === (activeNav ?? (mode === "admin" ? "Workspace overview" : "Overview")) ? " active" : ""}`} href={item.href} onClick={() => setMobileOpen(false)}>
                <Icon size={16} strokeWidth={1.8} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="mode-card">
            <p>View as</p>
            <div className="mode-toggle">
              <Link className={mode === "portal" ? "active" : ""} href="/portal">Client</Link>
              <Link className={mode === "admin" ? "active" : ""} href="/admin">Admin</Link>
            </div>
          </div>
          <div className="profile">
            <div className="avatar" style={mode === "portal" ? { backgroundColor: brandAccent } : undefined}>{mode === "admin" ? "JM" : brandMark ?? clientInitials}</div>
            <div>
              <div className="profile-name">{mode === "admin" ? "Jordan Mitchell" : clientName ?? "Client workspace"}</div>
              <div className="profile-role">{mode === "admin" ? "AI Rankers admin" : "SEO client"}</div>
            </div>
            <SignOutButton />
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div style={{ display: "flex", alignItems: "center" }}>
            <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobileOpen(true)}>
              <Menu size={17} />
            </button>
            <div className="breadcrumb">{mode === "admin" ? "AI Rankers / " : "Client portal / "}<strong>{mode === "admin" ? activeNav ?? "Workspace overview" : activeNav === "Activities" ? "Activity log" : "Overview"}</strong></div>
          </div>
          <div className="top-actions">
            <div className="preview-pill"><span className="dot" /> {mode === "portal" ? "Client presentation" : "Demo workspace"}</div>
            <div className="icon-button icon-button-muted" role="img" aria-label="Notifications will be available in a future release" title="Notifications will be available in a future release"><Activity size={16} /></div>
            {mobileOpen && <button className="icon-button" aria-label="Close navigation" onClick={() => setMobileOpen(false)}><X size={17} /></button>}
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
