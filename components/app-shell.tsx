"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SignOutButton } from "./sign-out-button";
import { PortalLiveSync } from "./portal-live-sync";
import {
  Activity,
  BarChart3,
  Building2,
  FileText,
  Layers3,
  LayoutDashboard,
  MessageCircle,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings2,
  ShieldCheck,
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
  hiddenNav?: string[];
  presentationMode?: boolean;
};

const portalNav = [
  { label: "Overview", href: "/portal", icon: LayoutDashboard },
  { label: "Website SEO", href: "/portal/website-seo", icon: BarChart3 },
  { label: "GBP performance", href: "/portal/gbp", icon: Building2 },
  { label: "Activities", href: "/portal/activities", icon: Activity },
  { label: "Team communication", href: "/portal/messages", icon: MessageCircle },
  { label: "Reports", href: "/portal/reports", icon: FileText },
];

const adminNav = [
  { label: "Workspace overview", href: "/admin", icon: LayoutDashboard },
  { label: "Clients", href: "/admin/clients", icon: UsersRound },
  { label: "Client communication", href: "/admin/messages", icon: MessageCircle },
  { label: "Feedback", href: "/admin/feedback", icon: MessageCircle },
  { label: "Users", href: "/admin/users", icon: UsersRound },
  { label: "Reports", href: "/admin/reports", icon: FileText },
  { label: "Templates", href: "/admin/templates", icon: Layers3 },
  { label: "Integrations", href: "/admin/integrations", icon: Settings2 },
  { label: "Settings", href: "/admin/settings", icon: ShieldCheck },
];

export function AppShell({ children, mode, clientName, brandMark, brandAccent, activeNav, hiddenNav = [], presentationMode = false }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const nav = (mode === "admin" ? adminNav : portalNav).filter((item) => !hiddenNav.includes(item.label));
  const activeItem = nav
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((first, second) => second.href.length - first.href.length)[0];
  const activeLabel = activeItem?.label ?? activeNav ?? (mode === "admin" ? "Workspace overview" : "Overview");
  const clientInitials = clientName?.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "CL";

  return (
    <div className={`app-shell${presentationMode ? " presentation-shell" : ""}`}>
      <aside className={`sidebar${mobileOpen ? " open" : ""}${collapsed ? " collapsed" : ""}`}>
        <div className="brand">
          {collapsed ? <div className="brand-mark-image"><Image src="/branding/ai-rankers/brand_logo.png" alt="The AI Rankers" width={52} height={17} priority /></div> : <div className="brand-logo-panel"><Image src="/branding/ai-rankers/brand_logo.png" alt="The AI Rankers" width={146} height={47} priority /></div>}
          <span className="brand-sub">SEO intelligence</span>
        </div>

        <div className="nav-label">{mode === "admin" ? "CRM workspace" : "Your workspace"}</div>
        <nav className="nav-list" aria-label="Primary navigation">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.label} className={`nav-item${item.label === activeLabel ? " active" : ""}`} href={item.href} aria-label={item.label} title={collapsed ? item.label : undefined} onClick={() => setMobileOpen(false)}>
                <Icon size={16} strokeWidth={1.8} />
                <span className="nav-item-label">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="profile">
            <div className="avatar" style={mode === "portal" ? { backgroundColor: brandAccent } : undefined}>{mode === "admin" ? "JM" : brandMark ?? clientInitials}</div>
            <div className="profile-copy">
            <div className="profile-name">{mode === "admin" ? "John Smith" : clientName ?? "Client workspace"}</div>
              <div className="profile-role">{mode === "admin" ? "The AI Rankers admin" : "SEO client"}</div>
            </div>
            <SignOutButton compact={collapsed} />
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div style={{ display: "flex", alignItems: "center" }}>
            <button className="icon-button sidebar-toggle" type="button" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} title={collapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={() => setCollapsed((current) => !current)}>
              {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
            </button>
            <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobileOpen(true)}>
              <Menu size={17} />
            </button>
            <div className="breadcrumb">{mode === "admin" ? "The AI Rankers / " : "Client portal / "}<strong>{activeLabel}</strong></div>
          </div>
          <div className="top-actions">
            <div className="preview-pill"><span className="dot" /> {mode === "portal" ? "Client presentation" : "Agency workspace"}</div>
            {mode === "portal" ? <PortalLiveSync /> : null}
            {mode === "portal" ? <SignOutButton variant="topbar" /> : null}
            <div className="icon-button icon-button-muted" role="img" aria-label="Notifications will be available in a future release" title="Notifications will be available in a future release"><Activity size={16} /></div>
            {mobileOpen && <button className="icon-button" aria-label="Close navigation" onClick={() => setMobileOpen(false)}><X size={17} /></button>}
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
