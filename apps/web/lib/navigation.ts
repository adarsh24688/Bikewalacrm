import {
  Users,
  Calendar,
  Kanban,
  MessageSquare,
  FileText,
  BarChart3,
  Phone,
  Settings,
  Zap,
  LayoutDashboard,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles?: string[];
}

export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["super_admin", "manager"] },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/follow-ups", label: "Follow-ups", icon: Calendar },
  { href: "/pipeline", label: "Pipeline", icon: Kanban },
  { href: "/inbox", label: "Inbox", icon: MessageSquare },
  { href: "/quotations", label: "Quotations", icon: FileText },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

export const settingsItems: NavItem[] = [
  { href: "/settings/team", label: "Team", icon: Users, roles: ["super_admin"] },
  { href: "/settings/products", label: "Products", icon: Phone, roles: ["super_admin", "manager"] },
  { href: "/settings/whatsapp", label: "WhatsApp", icon: MessageSquare, roles: ["super_admin", "manager"] },
  { href: "/settings/reports", label: "Report Config", icon: Settings, roles: ["super_admin", "manager"] },
  { href: "/settings/automation", label: "Automation", icon: Zap, roles: ["super_admin", "manager"] },
];

/** Hrefs shown as primary bottom nav items on mobile */
export const BOTTOM_NAV_PRIMARY_HREFS = ["/leads", "/follow-ups", "/pipeline", "/inbox"];

/** Returns nav items that overflow into the "More" sheet, filtered by role */
export function getMoreItems(role: string): NavItem[] {
  const overflowNav = navItems.filter(
    (item) =>
      !BOTTOM_NAV_PRIMARY_HREFS.includes(item.href) &&
      (!item.roles || item.roles.includes(role))
  );
  const filteredSettings = settingsItems.filter(
    (item) => !item.roles || item.roles.includes(role)
  );
  return [...overflowNav, ...filteredSettings];
}

/** Maps a pathname to its page title for the mobile header */
export function getPageTitle(pathname: string): string {
  const allItems = [...navItems, ...settingsItems];
  const match = allItems.find((item) => pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href)));
  return match?.label ?? "Yash CRM";
}
