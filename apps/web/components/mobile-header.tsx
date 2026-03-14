"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LogOut, User } from "lucide-react";
import Image from "next/image";
import { getPageTitle } from "@/lib/navigation";

interface MobileHeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role: string;
  };
}

export function MobileHeader({ user }: MobileHeaderProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-md pt-[env(safe-area-inset-top)] md:hidden">
      <h1 className="text-lg font-semibold">{getPageTitle(pathname)}</h1>

      <div ref={menuRef} className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-muted"
          aria-label="User menu"
        >
          {user.image ? (
            <Image
              src={user.image}
              alt=""
              width={36}
              height={36}
              className="rounded-full"
            />
          ) : (
            <User className="h-5 w-5 text-muted-foreground" />
          )}
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-2 w-56 rounded-lg border bg-popover p-3 shadow-lg">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {user.email}
            </p>
            <p className="text-xs capitalize text-muted-foreground">
              {user.role.replace("_", " ")}
            </p>
            <hr className="my-2" />
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-destructive hover:bg-accent"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
