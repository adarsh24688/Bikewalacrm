"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { navItems, getMoreItems, BOTTOM_NAV_PRIMARY_HREFS } from "@/lib/navigation";

interface BottomNavProps {
  userRole: string;
}

const primaryItems = navItems.filter((item) =>
  BOTTOM_NAV_PRIMARY_HREFS.includes(item.href)
);

export function BottomNav({ userRole }: BottomNavProps) {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);
  const moreItems = getMoreItems(userRole);

  // Close sheet on route change
  useEffect(() => {
    setSheetOpen(false);
  }, [pathname]);

  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (sheetOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sheetOpen]);

  const isMoreActive = moreItems.some((item) =>
    pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
  );

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav className="fixed inset-x-0 bottom-0 z-50 flex h-[calc(60px+env(safe-area-inset-bottom))] items-start border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg md:hidden">
        {primaryItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 pt-2 text-[10px] font-medium transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground active:text-primary"
              )}
            >
              <div className="relative">
                <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
                {isActive && (
                  <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 h-0.5 w-4 rounded-full bg-primary" />
                )}
              </div>
              {item.label}
            </Link>
          );
        })}

        {/* More Button */}
        <button
          onClick={() => setSheetOpen(true)}
          className={cn(
            "flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 pt-2 text-[10px] font-medium transition-colors",
            isMoreActive
              ? "text-primary"
              : "text-muted-foreground active:text-primary"
          )}
        >
          <MoreHorizontal
            className={cn("h-5 w-5", isMoreActive && "stroke-[2.5]")}
          />
          More
        </button>
      </nav>

      {/* More Sheet Overlay */}
      {sheetOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/40 md:hidden"
          onClick={() => setSheetOpen(false)}
        />
      )}

      {/* More Sheet */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-[70] rounded-t-2xl border-t bg-background pb-[env(safe-area-inset-bottom)] transition-transform duration-300 ease-out md:hidden",
          sheetOpen ? "translate-y-0" : "translate-y-full"
        )}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="text-sm font-semibold">More</h2>
          <button
            onClick={() => setSheetOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-accent"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[50vh] overflow-y-auto px-2 pb-4">
          {moreItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
