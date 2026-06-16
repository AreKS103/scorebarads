"use client";

import Link from "next/link";
import { useState } from "react";
import { BarChart3, Edit3, ExternalLink, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <div className="flex items-center gap-4 px-4 py-3 text-sm transition-colors hover:bg-muted/40">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Link href={`/campaigns/${encodedId}`} className="truncate font-medium text-foreground hover:underline">
            {campaign.campaignName}
          </Link>
          <CampaignTypeBadge type={campaign.campaignType} />
          <StatusBadge status={campaign.status} />
        </div>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>Budget <span className="tabular-nums text-foreground">{microsToDollar(campaign.dailyBudgetMicros)}</span></span>
          <span>Impressions <span className="tabular-nums text-foreground">{campaign.impressions.toLocaleString()}</span></span>
          <span>Clicks <span className="tabular-nums text-foreground">{campaign.clicks.toLocaleString()}</span></span>
          <span>Spend <span className="tabular-nums text-foreground">{microsToDollar(campaign.spendMicros)}</span></span>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-1">
        <Button variant="ghost" size="sm" onClick={toggleStatus} disabled={isUpdating}>
          {isUpdating ? <LoadingSpinner /> : nextStatus === "ENABLED" ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          {nextStatus === "ENABLED" ? "Enable" : "Pause"}
        </Button>
        <Button variant="ghost" size="sm" asChild><Link href={`/create?clone=${encodedId}`}><Edit3 className="h-4 w-4" />Edit</Link></Button>
        <Button variant="ghost" size="sm" asChild><Link href={`/campaigns/${encodedId}`}><BarChart3 className="h-4 w-4" />Report</Link></Button>
        <Button variant="ghost" size="sm" asChild><a href="https://ads.google.com/" target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" />Ads</a></Button>
      </div>
    </div>
  );
}
