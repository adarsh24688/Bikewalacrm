"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LogOut, ChevronRight, PanelLeftClose, PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { navItems, settingsItems } from "@/lib/navigation";

interface SidebarProps {
  user: {
    name?: string | null;
    email?: string | null;
    role: string;
  };
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const initials = (user.name || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <aside
      className={cn(
        "hidden flex-col border-r border-border/60 bg-[hsl(var(--sidebar-bg))] md:flex transition-all duration-200 ease-in-out",
        collapsed ? "w-[68px]" : "w-[260px]"
      )}
    >
      {/* Branding */}
      <div className={cn("flex h-14 items-center gap-2.5 shrink-0", collapsed ? "justify-center px-2" : "px-5")}>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold">
          L
        </div>
        {!collapsed && (
          <Link href="/" className="text-[15px] font-semibold tracking-tight text-foreground truncate">
            LeadCRM
          </Link>
        )}
      </div>

      {/* Main Nav */}
      <nav className={cn("flex-1 overflow-y-auto py-2", collapsed ? "px-2" : "px-3")}>
        <div className="space-y-0.5">
          {navItems
            .filter((item) => !item.roles || item.roles.includes(user.role))
            .map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "group relative flex items-center rounded-lg text-[13px] font-medium transition-all",
                    collapsed ? "justify-center px-0 py-2" : "gap-3 px-3 py-2",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  {isActive && !collapsed && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full bg-primary" />
                  )}
                  {isActive && collapsed && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full bg-primary" />
                  )}
                  <Icon className={cn("h-4 w-4 shrink-0", isActive && "text-primary")} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                  {!collapsed && isActive && (
                    <ChevronRight className="ml-auto h-3.5 w-3.5 opacity-50" />
                  )}
                </Link>
              );
            })}
        </div>

        {/* Settings Section */}
        {settingsItems.filter((item) => !item.roles || item.roles.includes(user.role)).length > 0 && (
          <>
            <div className={cn("my-4 border-t border-border/60", collapsed ? "mx-2" : "mx-3")} />
            {!collapsed && (
              <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                Settings
              </p>
            )}
            <div className="space-y-0.5">
              {settingsItems
                .filter((item) => !item.roles || item.roles.includes(user.role))
                .map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "group relative flex items-center rounded-lg text-[13px] font-medium transition-all",
                        collapsed ? "justify-center px-0 py-2" : "gap-3 px-3 py-2",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full bg-primary" />
                      )}
                      <Icon className={cn("h-4 w-4 shrink-0", isActive && "text-primary")} />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  );
                })}
            </div>
          </>
        )}
      </nav>

      {/* Collapse Toggle + User Section */}
      <div className="border-t border-border/60 p-2 space-y-1">
        {/* User */}
        {collapsed ? (
          <div className="flex justify-center py-1">
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              title={`${user.name} — Sign out`}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors"
            >
              {initials}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-lg px-2 py-1.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium leading-tight">{user.name}</p>
              <p className="truncate text-[11px] text-muted-foreground leading-tight mt-0.5">
                {user.role.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
              </p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className={cn(
            "flex items-center rounded-lg text-[13px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-all w-full",
            collapsed ? "justify-center py-2" : "gap-3 px-3 py-2"
          )}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeft className="h-4 w-4 shrink-0" />
          ) : (
            <>
              <PanelLeftClose className="h-4 w-4 shrink-0" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
