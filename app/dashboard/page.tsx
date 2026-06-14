"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { PlusCircle, RefreshCw } from "lucide-react";
import { AppHeader } from "@/components/shared/AppHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CampaignCard } from "@/components/dashboard/CampaignCard";
import { KPIBar } from "@/components/dashboard/KPIBar";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { createClient } from "@/lib/supabase/client";
import type { CampaignSummary } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState("");

  const syncCampaigns = useCallback(async (showSpinner = true) => {
    if (showSpinner) {
      setIsSyncing(true);
    }
    setError("");
    const response = await fetch("/api/google-ads/campaigns/list", { cache: "no-store" });
    const result = await response.json();
    setIsLoading(false);
    setIsSyncing(false);

    if (!response.ok || !result.success) {
      const message = result.error || "Campaign sync failed.";
      if (/credentials|connected|customer id/i.test(message)) {
        router.push(`/connect?error=${encodeURIComponent(message)}`);
        return;
      }
      setError(message);
      return;
    }

    setCampaigns(result.campaigns);
  }, [router]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/login");
        return;
      }
      void syncCampaigns(false);
    });
  }, [router, syncCampaigns]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">Last 7 days</p>
            <h2 className="text-3xl font-bold text-foreground">Dashboard</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => void syncCampaigns()} disabled={isSyncing}>{isSyncing ? <LoadingSpinner /> : <RefreshCw className="h-4 w-4" />}Sync Now</Button>
            <Button asChild><Link href="/create"><PlusCircle className="h-4 w-4" />New Campaign</Link></Button>
          </div>
        </div>

        {isLoading ? <Card className="flex items-center gap-3"><LoadingSpinner className="text-primary" />Syncing Google Ads campaigns...</Card> : null}
        {error ? <Card className="border-red-200 bg-red-50 text-sm font-medium text-red-700">{error}</Card> : null}

        <KPIBar campaigns={campaigns} />

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-foreground">Campaigns</h3>
            <p className="text-sm text-muted-foreground">{campaigns.length} synced</p>
          </div>
          {campaigns.length > 0 ? campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.campaignResourceName}
              campaign={campaign}
              onStatusChanged={(resourceName, status) => setCampaigns((current) => current.map((item) => item.campaignResourceName === resourceName ? { ...item, status } : item))}
            />
          )) : !isLoading ? <Card className="text-sm text-muted-foreground">No Google Ads campaigns returned for the last 7 days. Create a new campaign or confirm the connected customer ID.</Card> : null}
        </section>
      </main>
    </div>
  );
}
