"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, PlusCircle, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function AppHeader() {
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/login");
  }

  return (
    <header className="border-b border-border bg-card text-foreground">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 lg:px-8">
        <Link href="/dashboard" className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Score Sports Bar & Grill</p>
          <h1 className="truncate text-xl font-bold">Score Ads Manager</h1>
        </Link>
        <nav className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" asChild><Link href="/create"><PlusCircle className="h-4 w-4" />New Campaign</Link></Button>
          <Button variant="ghost" asChild><Link href="/settings"><Settings className="h-4 w-4" />Settings</Link></Button>
          <Button variant="ghost" onClick={signOut}><LogOut className="h-4 w-4" />Sign out</Button>
        </nav>
      </div>
    </header>
  );
}
