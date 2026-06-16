"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, LogOut, PlusCircle, Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useWizardStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/create", label: "New campaign", icon: PlusCircle },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    await createClient().auth.signOut({ scope: "local" }).catch(() => null);
    useWizardStore.getState().reset();
    router.replace("/login");
  }

  return (
    <header className="border-b border-border bg-background text-foreground lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:w-[240px] lg:border-b-0 lg:border-r">
      <div className="flex h-full flex-wrap items-center justify-between gap-3 px-3 py-3 lg:flex-col lg:items-stretch lg:justify-start">
        <Link href="/dashboard" className="min-w-0 px-2 py-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Score Sports</p>
          <h1 className="truncate text-sm font-semibold tracking-tight">Score Ads Manager</h1>
        </Link>
        <nav className="flex flex-wrap items-center gap-1 lg:mt-4 lg:flex-col lg:items-stretch">
          <p className="hidden px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:mb-1 lg:block">Workspace</p>
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex h-8 cursor-pointer items-center gap-2 rounded-sm px-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                  active && "bg-accent font-medium text-accent-foreground",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={signOut}
            className="flex h-8 cursor-pointer items-center gap-2 rounded-sm px-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </nav>
      </div>
    </header>
  );
}
