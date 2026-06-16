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
    { label: "Active Campaigns", value: activeCampaigns.toString() },
    { label: "Spend", value: microsToDollar(spendMicros) },
    { label: "Clicks", value: clicks.toLocaleString() },
    { label: "CTR", value: formatPercent(averageCtr) },
  ];

  return (
    <div className="grid gap-6 rounded-lg border border-border bg-card p-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.label}>
          <p className="text-3xl font-bold tabular-nums text-foreground">{item.value}</p>
          <p className="text-sm text-muted-foreground">{item.label}</p>
        </div>
      ))}
    </div>
  );
}
