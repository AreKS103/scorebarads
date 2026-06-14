"use client";

import Link from "next/link";
import { useState } from "react";
import { BarChart3, Edit3, ExternalLink, Pause, Play, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CampaignTypeBadge, StatusBadge } from "@/components/shared/StatusBadge";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { microsToDollar } from "@/lib/google-ads/utils";
import type { CampaignSummary } from "@/lib/types";

interface CampaignCardProps {
  campaign: CampaignSummary;
  onStatusChanged: (resourceName: string, status: "ENABLED" | "PAUSED") => void;
}

export function CampaignCard({ campaign, onStatusChanged }: CampaignCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const nextStatus = campaign.status === "ENABLED" ? "PAUSED" : "ENABLED";
  const encodedId = encodeURIComponent(campaign.campaignResourceName);

  async function toggleStatus() {
    setIsUpdating(true);
    const response = await fetch(`/api/google-ads/campaigns/${encodedId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    const result = await response.json();
    setIsUpdating(false);

    if (response.ok && result.success) {
      onStatusChanged(campaign.campaignResourceName, nextStatus);
    } else {
      window.alert(result.error || "Status update failed.");
    }
  }

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-lg font-bold text-foreground">{campaign.campaignName}</h3>
            <CampaignTypeBadge type={campaign.campaignType} />
            <StatusBadge status={campaign.status} />
          </div>
          <div className="mt-3 grid gap-3 text-sm sm:grid-cols-4">
            <div><span className="block text-xs uppercase text-muted-foreground">Daily budget</span><strong>{microsToDollar(campaign.dailyBudgetMicros)}</strong></div>
            <div><span className="block text-xs uppercase text-muted-foreground">Impressions</span><strong>{campaign.impressions.toLocaleString()}</strong></div>
            <div><span className="block text-xs uppercase text-muted-foreground">Clicks</span><strong>{campaign.clicks.toLocaleString()}</strong></div>
            <div><span className="block text-xs uppercase text-muted-foreground">Spend</span><strong>{microsToDollar(campaign.spendMicros)}</strong></div>
          </div>
          <div className="mt-4 flex h-8 items-end gap-1" aria-label="7-day sparkline indicator">
            {[0.3, 0.52, 0.44, 0.7, 0.62, 0.88, 0.76].map((height, index) => (
              <span key={index} className="w-3 rounded-t bg-primary" style={{ height: `${height * 100}%` }} />
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={toggleStatus} disabled={isUpdating}>
            {isUpdating ? <LoadingSpinner /> : nextStatus === "ENABLED" ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            {nextStatus === "ENABLED" ? "Enable" : "Pause"}
          </Button>
          <Button variant="secondary" asChild><Link href={`/create?clone=${encodedId}`}><Edit3 className="h-4 w-4" />Edit</Link></Button>
          <Button variant="ghost" asChild><Link href={`/campaigns/${encodedId}`}><BarChart3 className="h-4 w-4" />View Report</Link></Button>
          <Button variant="ghost" asChild><a href="https://ads.google.com/" target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" />Ads UI</a></Button>
        </div>
      </div>
      {campaign.lastSyncedAt ? <p className="mt-4 flex items-center gap-1 text-xs text-muted-foreground"><RefreshCw className="h-3 w-3" /> Synced {new Date(campaign.lastSyncedAt).toLocaleString()}</p> : null}
    </Card>
  );
}
