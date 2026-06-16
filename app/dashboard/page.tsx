"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Archive, BarChart3, FolderOpen, PlugZap, PlusCircle, RefreshCw, ShieldCheck } from "lucide-react";
import { AppHeader } from "@/components/shared/AppHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CampaignCard } from "@/components/dashboard/CampaignCard";
import { KPIBar } from "@/components/dashboard/KPIBar";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { StatusBadge } from "@/components/shared/StatusBadge";
import type { CampaignSummary } from "@/lib/types";

function DashboardSidebar({ campaigns, isSyncing, onSync }: { campaigns: CampaignSummary[]; isSyncing: boolean; onSync: () => void }) {
  const enabled = campaigns.filter((campaign) => campaign.status === "ENABLED").length;
  const paused = campaigns.filter((campaign) => campaign.status === "PAUSED").length;
  const search = campaigns.filter((campaign) => campaign.campaignType === "SEARCH").length;
  const visual = campaigns.filter((campaign) => campaign.campaignType !== "SEARCH").length;
  const needsAttention = campaigns.filter((campaign) => campaign.clicks === 0 && campaign.impressions > 0).length;

  return (
    <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
      <Card className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Campaign folders</h3>
        </div>
        <div className="mt-4 grid gap-1 text-sm">
          <div className="flex h-8 items-center justify-between rounded-sm px-2 hover:bg-muted/50"><span>All campaigns</span><span className="font-medium tabular-nums text-foreground">{campaigns.length}</span></div>
          <div className="flex h-8 items-center justify-between rounded-sm px-2 hover:bg-muted/50"><span>Search intent</span><span className="font-medium tabular-nums text-foreground">{search}</span></div>
          <div className="flex h-8 items-center justify-between rounded-sm px-2 hover:bg-muted/50"><span>Visual / video</span><span className="font-medium tabular-nums text-foreground">{visual}</span></div>
          <div className="flex h-8 items-center justify-between rounded-sm px-2 hover:bg-muted/50"><span>Paused drafts</span><span className="font-medium tabular-nums text-foreground">{paused}</span></div>
        </div>
      </Card>

      <Card className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Account health</h3>
        </div>
        <div className="mt-4 space-y-3 text-sm">
          <div className="flex items-center justify-between"><span className="text-muted-foreground">Connection</span><StatusBadge status={campaigns.length || !needsAttention ? "ENABLED" : "UNKNOWN"} /></div>
          <div className="flex items-center justify-between"><span className="text-muted-foreground">Enabled</span><span className="font-medium tabular-nums text-foreground">{enabled}</span></div>
          <div className="flex items-center justify-between"><span className="text-muted-foreground">Needs attention</span><span className="font-medium tabular-nums text-foreground">{needsAttention}</span></div>
        </div>
        <Button type="button" variant="ghost" className="mt-4 w-full" onClick={onSync} disabled={isSyncing}>{isSyncing ? <LoadingSpinner /> : <RefreshCw className="h-4 w-4" />}Refresh health</Button>
      </Card>

      <Card className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Optimization radar</h3>
        </div>
        <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
          <li className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />Check zero-click campaigns for keyword/ad relevance.</li>
          <li className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />Keep event campaigns paused until landing page and budget are verified.</li>
          <li className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />Use Search for high-intent demand and visual formats for match awareness.</li>
        </ul>
      </Card>

      <Card className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <Archive className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Quick actions</h3>
        </div>
        <div className="mt-4 grid gap-2">
          <Button asChild><Link href="/create"><PlusCircle className="h-4 w-4" />New campaign</Link></Button>
          <Button variant="ghost" asChild><Link href="/connect"><PlugZap className="h-4 w-4" />Google connection</Link></Button>
        </div>
      </Card>
    </aside>
  );
}

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
    fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) {
          router.replace("/login");
          return;
        }
        void syncCampaigns(false);
      })
      .catch(() => router.replace("/login"));
  }, [router, syncCampaigns]);

  return (
    <div className="min-h-screen bg-background lg:pl-[240px]">
      <AppHeader />
      <main className="mx-auto max-w-screen-xl space-y-6 px-6 py-6">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Last 7 days</p>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => void syncCampaigns()} disabled={isSyncing}>{isSyncing ? <LoadingSpinner /> : <RefreshCw className="h-4 w-4" />}Sync Now</Button>
            <Button asChild><Link href="/create"><PlusCircle className="h-4 w-4" />New Campaign</Link></Button>
          </div>
        </div>

        {isLoading ? <Card className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 text-sm"><LoadingSpinner className="text-muted-foreground" />Syncing Google Ads campaigns...</Card> : null}
        {error ? <Card className="rounded-lg border border-border bg-card p-4 text-sm font-medium text-destructive">{error}</Card> : null}

        <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <DashboardSidebar campaigns={campaigns} isSyncing={isSyncing} onSync={() => void syncCampaigns()} />

          <div className="space-y-6">
            <KPIBar campaigns={campaigns} />

            <section className="rounded-lg border border-border bg-card">
              <div className="flex h-10 items-center justify-between border-b border-border px-4">
                <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Campaigns</h3>
                <p className="text-xs text-muted-foreground">{campaigns.length} synced</p>
              </div>
              <div className="divide-y divide-border">
                {campaigns.length > 0 ? campaigns.map((campaign) => (
                  <CampaignCard
                    key={campaign.campaignResourceName}
                    campaign={campaign}
                    onStatusChanged={(resourceName, status) => setCampaigns((current) => current.map((item) => item.campaignResourceName === resourceName ? { ...item, status } : item))}
                  />
                )) : !isLoading ? <p className="px-4 py-6 text-sm text-muted-foreground">No Google Ads campaigns returned for the last 7 days. Create a new campaign or confirm the connected customer ID.</p> : null}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
