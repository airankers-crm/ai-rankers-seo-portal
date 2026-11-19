"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SignOutButton } from "./sign-out-button";
import { PortalLiveSync } from "./portal-live-sync";
import { PortalPreferenceEffects } from "./portal-preference-effects";
import {
  Activity,
  BarChart3,
  Building2,
  ChevronDown,
  CircleHelp,
  FileText,
  LayoutDashboard,
  MessageCircle,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Settings2,
  ShieldCheck,
  UsersRound,
  LineChart,
} from "lucide-react";

type AppShellProps = {
  children: React.ReactNode;
  mode: "portal" | "admin";
  clientName?: string;
  brandMark?: string;
  brandAccent?: string;
  activeNav?: string;
  hiddenNav?: string[];
  shellVariant?: "analytics" | "analytics-details";
};

type PortalService = "website" | "analytics" | "gbp";
type PortalServiceEntitlements = Record<PortalService, boolean>;
type NavItem = { label: string; href: string; icon: typeof LayoutDashboard; service?: PortalService };
type NavGroup = { label: string; items: NavItem[] };

const portalNavGroups: NavGroup[] = [
  {
    label: "Workspace",
    items: [
      { label: "Overview", href: "/portal", icon: LayoutDashboard },
      { label: "Website GSC", href: "/portal/website-seo", icon: BarChart3, service: "website" },
      { label: "Analytics", href: "/portal/analytics", icon: LineChart, service: "analytics" },
      { label: "GBP", href: "/portal/gbp", icon: Building2, service: "gbp" },
    ],
  },
  {
    label: "Delivery",
    items: [{ label: "Activities", href: "/portal/activities", icon: Activity }],
  },
  {
    label: "Support",
    items: [{ label: "Feedback", href: "/portal/feedback", icon: MessageCircle }],
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
    label: "Support",
    items: [{ label: "Feedback", href: "/admin/feedback", icon: MessageCircle }],
  },
  {
    label: "Reporting & content",
    items: [
      { label: "Reports", href: "/admin/reports", icon: FileText },
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

export function AppShell({ children, mode, clientName, brandMark, brandAccent, activeNav, hiddenNav = [], shellVariant }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [unreadReports, setUnreadReports] = useState(0);
  const [unreadFeedback, setUnreadFeedback] = useState(0);
  const [portalServices, setPortalServices] = useState<PortalServiceEntitlements | null>(null);
  const pathname = usePathname();
  useEffect(() => {
    if (mode !== "portal" && mode !== "admin") return;
    let active = true;

    if (mode === "portal") {
      void fetch("/api/portal/services", { cache: "no-store" }).then(async (response) => {
        if (!active || !response.ok) return;
        const payload = await response.json() as Partial<PortalServiceEntitlements>;
        setPortalServices({ website: payload.website !== false, analytics: payload.analytics !== false, gbp: payload.gbp !== false });
      }).catch(() => {
        // Keep navigation available if entitlement lookup is temporarily unavailable.
      });
    }

    async function refreshNotifications() {
      try {
        const response = await fetch(mode === "portal" ? "/api/portal/notifications" : "/api/admin/notifications", { cache: "no-store" });
        if (!active || !response.ok) return;
        const payload = await response.json() as { reports?: number; feedback?: number };
        if (mode === "portal") setUnreadReports(Number.isFinite(payload.reports) ? Math.max(0, payload.reports ?? 0) : 0);
        else setUnreadFeedback(Number.isFinite(payload.feedback) ? Math.max(0, payload.feedback ?? 0) : 0);
      } catch {
        // Notification badges are helpful but must never block portal navigation.
      }
    }

    async function markAdminFeedbackViewed() {
      if (mode !== "admin" || pathname !== "/admin/feedback") return;
      try {
        await fetch("/api/admin/notifications", { method: "POST" });
        if (active) setUnreadFeedback(0);
      } catch {
        // The inbox remains usable if marking notifications read fails.
      }
    }

    void refreshNotifications();
    void markAdminFeedbackViewed();
    const interval = window.setInterval(() => void refreshNotifications(), 30_000);
    const onReportSeen = () => void refreshNotifications();
    window.addEventListener("portal-report-seen", onReportSeen);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("portal-report-seen", onReportSeen);
    };
  }, [mode, pathname]);
  const navGroups: NavGroup[] = mode === "admin" ? adminNavGroups : portalNavGroups;
  const visibleNavGroups = navGroups
    .map((group) => ({ ...group, items: group.items.filter((item) => !hiddenNav.includes(item.label) && !(mode === "portal" && item.service && portalServices && !portalServices[item.service])) }))
    .filter((group) => group.items.length > 0);
  const nav = visibleNavGroups.flatMap((group) => group.items);
  const activeItem = nav
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((first, second) => second.href.length - first.href.length)[0];
  const activeLabel = activeItem?.label ?? activeNav ?? (mode === "admin" ? "Workspace overview" : "Overview");
  const clientInitials = clientName?.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "CL";
  const accountName = mode === "admin" ? "Scott" : clientName ?? "Client workspace";
  const accountRole = mode === "admin" ? "AI Rankers admin" : "Client portal";

  return (
    <div className={`app-shell ${mode}-shell${shellVariant ? ` ${shellVariant}-shell` : ""}`}>
      {mode === "portal" ? <PortalPreferenceEffects /> : null}
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <aside id="portal-navigation" className={`sidebar${mobileOpen ? " open" : ""}${collapsed ? " collapsed" : ""}`}>
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
                  const badgeCount = mode === "portal" && item.href === "/portal/reports" ? unreadReports : mode === "admin" && item.href === "/admin/feedback" ? unreadFeedback : 0;
                  const itemLabel = badgeCount > 0 ? `${item.label} (${badgeCount} unread)` : item.label;
                  return (
                    <Link key={item.label} className={`nav-item${item.label === activeLabel ? " active" : ""}`} href={item.href} aria-label={itemLabel} title={collapsed ? itemLabel : undefined} onClick={() => setMobileOpen(false)}>
                      <Icon size={16} strokeWidth={1.8} />
                      <span className="nav-item-label">{item.label}</span>
                      {badgeCount > 0 ? <span className="nav-item-badge" aria-hidden="true">{badgeCount > 9 ? "9+" : badgeCount}</span> : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="profile">
            <div className="avatar" style={mode === "portal" ? { backgroundColor: brandAccent } : undefined}>{mode === "admin" ? "SC" : brandMark ?? clientInitials}</div>
            <div className="profile-copy">
            <div className="profile-name">{mode === "admin" ? "Scott" : clientName ?? "Client workspace"}</div>
              <div className="profile-role">{mode === "admin" ? "The AI Rankers admin" : "SEO client"}</div>
            </div>
            <SignOutButton compact={collapsed} />
          </div>
        </div>
      </aside>
      {mobileOpen ? <button className="sidebar-backdrop" type="button" aria-label="Close navigation" onClick={() => setMobileOpen(false)} /> : null}

      <main className="main" id="main-content">
        <header className="topbar">
          <div className="topbar-leading">
            <button className="icon-button sidebar-toggle" type="button" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} title={collapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={() => setCollapsed((current) => !current)}>{collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}</button>
            <button className="icon-button mobile-menu" type="button" aria-label="Open navigation" aria-expanded={mobileOpen} aria-controls="portal-navigation" onClick={() => setMobileOpen((current) => !current)}><Menu size={17} /></button>
            <div className="breadcrumb"><span>{mode === "admin" ? "The AI Rankers" : "Client portal"}</span><i>/</i><strong>{activeLabel}</strong></div>
          </div>
          <div className="top-actions">
            {mode === "portal" ? <PortalLiveSync /> : <span className="workspace-status"><span className="dot" /> Workspace ready</span>}
            <Link className="topbar-help" href={mode === "admin" ? "/admin/feedback" : "/portal/feedback"} aria-label={mode === "admin" ? (unreadFeedback > 0 ? `Open client feedback (${unreadFeedback} unread)` : "Open client feedback") : "Share feedback"} title={mode === "admin" ? "Client feedback" : "Share feedback"}><CircleHelp size={17} />{mode === "admin" && unreadFeedback > 0 ? <span className="topbar-notification-badge" aria-hidden="true">{unreadFeedback > 9 ? "9+" : unreadFeedback}</span> : null}</Link>
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
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
