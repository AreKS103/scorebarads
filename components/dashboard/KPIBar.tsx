import { MousePointerClick, Percent, RadioTower, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatPercent } from "@/lib/utils";
import { microsToDollar } from "@/lib/google-ads/utils";
import type { CampaignSummary } from "@/lib/types";

interface KPIBarProps {
  campaigns: CampaignSummary[];
}

export function KPIBar({ campaigns }: KPIBarProps) {
  const activeCampaigns = campaigns.filter((campaign) => campaign.status === "ENABLED").length;
  const spendMicros = campaigns.reduce((sum, campaign) => sum + campaign.spendMicros, 0);
  const clicks = campaigns.reduce((sum, campaign) => sum + campaign.clicks, 0);
  const impressions = campaigns.reduce((sum, campaign) => sum + campaign.impressions, 0);
  const averageCtr = impressions > 0 ? clicks / impressions : 0;
  const items = [
    { label: "Total Active Campaigns", value: activeCampaigns.toString(), icon: RadioTower },
    { label: "Total Spend", value: microsToDollar(spendMicros), icon: Wallet },
    { label: "Total Clicks", value: clicks.toLocaleString(), icon: MousePointerClick },
    { label: "Avg CTR", value: formatPercent(averageCtr), icon: Percent },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label} className="p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{item.label}</p>
              <p className="mt-2 text-2xl font-bold text-foreground">{item.value}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-secondary text-foreground">
              <item.icon className="h-5 w-5" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
