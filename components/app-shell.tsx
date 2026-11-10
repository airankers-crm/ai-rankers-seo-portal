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
  ChevronDown,
  CircleHelp,
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

type NavItem = { label: string; href: string; icon: typeof LayoutDashboard };
type NavGroup = { label: string; items: NavItem[] };

const portalNavGroups: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      { label: "Overview", href: "/portal", icon: LayoutDashboard },
      { label: "Website SEO", href: "/portal/website-seo", icon: BarChart3 },
      { label: "GBP performance", href: "/portal/gbp", icon: Building2 },
    ],
  },
  {
    label: "Communication",
    items: [
      { label: "Activities", href: "/portal/activities", icon: Activity },
      { label: "Team communication", href: "/portal/messages", icon: MessageCircle },
    ],
  },
  {
    label: "Reporting",
    items: [{ label: "Reports", href: "/portal/reports", icon: FileText }],
  },
  {
    label: "Account",
    items: [{ label: "Settings", href: "/portal/settings", icon: Settings2 }],
  },
];

const adminNavGroups: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      { label: "Workspace overview", href: "/admin", icon: LayoutDashboard },
      { label: "Clients", href: "/admin/clients", icon: UsersRound },
    ],
  },
  {
    label: "Communication",
    items: [
      { label: "Client communication", href: "/admin/messages", icon: MessageCircle },
      { label: "Feedback", href: "/admin/feedback", icon: MessageCircle },
    ],
  },
  {
    label: "Reporting & content",
    items: [
      { label: "Reports", href: "/admin/reports", icon: FileText },
      { label: "Templates", href: "/admin/templates", icon: Layers3 },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Users", href: "/admin/users", icon: UsersRound },
      { label: "Integrations", href: "/admin/integrations", icon: Settings2 },
      { label: "Settings", href: "/admin/settings", icon: ShieldCheck },
    ],
  },
];

export function AppShell({ children, mode, clientName, brandMark, brandAccent, activeNav, hiddenNav = [], presentationMode = false }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const pathname = usePathname();
  const navGroups: NavGroup[] = mode === "admin" ? adminNavGroups : portalNavGroups;
  const visibleNavGroups = navGroups
    .map((group) => ({ ...group, items: group.items.filter((item) => !hiddenNav.includes(item.label)) }))
    .filter((group) => group.items.length > 0);
  const nav = visibleNavGroups.flatMap((group) => group.items);
  const activeItem = nav
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((first, second) => second.href.length - first.href.length)[0];
  const activeLabel = activeItem?.label ?? activeNav ?? (mode === "admin" ? "Workspace overview" : "Overview");
  const clientInitials = clientName?.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "CL";
  const accountName = mode === "admin" ? "John Smith" : clientName ?? "Client workspace";
  const accountRole = mode === "admin" ? "AI Rankers admin" : "Client portal";

  return (
    <div className={`app-shell ${mode}-shell${presentationMode ? " presentation-shell" : ""}`}>
      <aside className={`sidebar${mobileOpen ? " open" : ""}${collapsed ? " collapsed" : ""}`}>
        <div className="brand">
          {collapsed ? <div className="brand-mark-image"><Image src="/branding/ai-rankers/brand_logo.png" alt="The AI Rankers" width={52} height={17} priority /></div> : <div className="brand-logo-panel"><Image src="/branding/ai-rankers/brand_logo.png" alt="The AI Rankers" width={146} height={47} priority /></div>}
          <span className="brand-sub">SEO intelligence</span>
        </div>

        <div className="nav-label">{mode === "admin" ? "CRM workspace" : "Client workspace"}</div>
        <nav className="nav-list" aria-label="Primary navigation">
          {visibleNavGroups.map((group) => (
            <div className="nav-group" key={group.label || "primary"}>
              {group.label ? <div className="nav-group-label">{group.label}</div> : null}
              <div className="nav-group-items">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link key={item.label} className={`nav-item${item.label === activeLabel ? " active" : ""}`} href={item.href} aria-label={item.label} title={collapsed ? item.label : undefined} onClick={() => setMobileOpen(false)}>
                      <Icon size={16} strokeWidth={1.8} />
                      <span className="nav-item-label">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
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
          <div className="topbar-leading">
            <button className="icon-button sidebar-toggle" type="button" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} title={collapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={() => setCollapsed((current) => !current)}>
              {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
            </button>
            <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobileOpen(true)}>
              <Menu size={17} />
            </button>
            <div className="breadcrumb"><span>{mode === "admin" ? "The AI Rankers" : "Client portal"}</span><i>/</i><strong>{activeLabel}</strong></div>
          </div>
          <div className="top-actions">
            {mode === "portal" ? <PortalLiveSync /> : <span className="workspace-status"><span className="dot" /> Workspace ready</span>}
            <Link className="topbar-help" href={mode === "admin" ? "/admin/messages" : "/portal/messages"} aria-label="Open help and support" title="Help and support"><CircleHelp size={17} /></Link>
            <div className="topbar-account">
              <button className="topbar-account-trigger" type="button" aria-haspopup="menu" aria-expanded={accountOpen} onClick={() => setAccountOpen((current) => !current)}>
                <span className="topbar-account-avatar" style={mode === "portal" ? { backgroundColor: brandAccent } : undefined}>{mode === "admin" ? "JS" : brandMark ?? clientInitials}</span>
                <span className="topbar-account-copy"><strong>{accountName}</strong><small>{accountRole}</small></span>
                <ChevronDown size={14} />
              </button>
              {accountOpen ? <div className="topbar-account-menu" role="menu">
                <div className="topbar-account-menu-head"><strong>{accountName}</strong><span>{accountRole}</span></div>
                <Link href={mode === "admin" ? "/admin/settings" : "/portal/settings"} role="menuitem" onClick={() => setAccountOpen(false)}>{mode === "admin" ? "Workspace settings" : "Account settings"}</Link>
                <SignOutButton variant="menu" />
              </div> : null}
            </div>
            {mobileOpen && <button className="icon-button" aria-label="Close navigation" onClick={() => setMobileOpen(false)}><X size={17} /></button>}
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
