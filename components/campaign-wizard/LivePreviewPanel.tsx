"use client";

import { CalendarDays, DollarSign, MapPin } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { CampaignTypeBadge, StatusBadge } from "@/components/shared/StatusBadge";
import { DisplayAdPreview } from "@/components/ads/DisplayAdPreview";
import { RSAPreview } from "@/components/ads/RSAPreview";
import { microsToDollar, dollarToMicros } from "@/lib/google-ads/utils";
import { useWizardStore } from "@/lib/store";

export function LivePreviewPanel() {
  const { formData } = useWizardStore();
  const location = formData.targeting.locationPreset.replace("_", " ");

  return (
    <aside className="sticky top-6 space-y-4">
      <Card className="p-5">
        <CardHeader className="mb-4">
          <CardTitle>Live Preview</CardTitle>
        </CardHeader>
        <div className="space-y-4">
          <div>
            <div className="flex flex-wrap gap-2"><CampaignTypeBadge type={formData.campaignType} /><StatusBadge status={formData.basics.launchStatus} /></div>
            <h3 className="mt-3 text-xl font-bold text-foreground">{formData.basics.campaignName || "Untitled campaign"}</h3>
            {formData.basics.matchEvent ? <p className="mt-1 text-sm text-muted-foreground">{formData.basics.matchEvent}</p> : null}
          </div>
          <div className="grid gap-3 text-sm">
            <div className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-primary" />{microsToDollar(dollarToMicros(formData.basics.dailyBudget))} daily</div>
            <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" />{location}</div>
            <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" />{formData.basics.startDate} to {formData.basics.endDate || "open end"}</div>
          </div>
        </div>
      </Card>

      {formData.campaignType === "SEARCH" ? <RSAPreview creative={formData.creative.search} /> : null}
      {formData.campaignType === "DISPLAY" ? <DisplayAdPreview creative={formData.creative.display} image={formData.creative.display.landscapeImages[0]} /> : null}
      {formData.campaignType === "PERFORMANCE_MAX" ? (
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Performance Max Asset Group</p>
          <h4 className="mt-2 text-lg font-bold text-foreground">{formData.creative.performanceMax.headlines.find((item) => item.text)?.text || "Score Bar Live Sports"}</h4>
          <p className="mt-2 text-sm text-muted-foreground">{formData.creative.performanceMax.descriptions.find((item) => item.text)?.text || "Images, headlines and final URL will create the PMax asset group."}</p>
        </Card>
      ) : null}
      {formData.campaignType === "VIDEO" ? (
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">YouTube Ad</p>
          <h4 className="mt-2 text-lg font-bold text-foreground">{formData.creative.video.headline}</h4>
          <p className="mt-2 text-sm text-muted-foreground">{formData.creative.video.description}</p>
          <div className="mt-4 inline-flex rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">{formData.creative.video.ctaText}</div>
        </Card>
      ) : null}
      {formData.campaignType === "DEMAND_GEN" ? (
        <Card className="p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Demand Gen</p>
          <h4 className="mt-2 text-lg font-bold text-foreground">{formData.creative.demandGen.headlines.find((item) => item.text)?.text || "Match Night At Score"}</h4>
          <p className="mt-2 text-sm text-muted-foreground">{formData.creative.demandGen.descriptions.find((item) => item.text)?.text || "Visual placements across YouTube, Gmail and Discover."}</p>
        </Card>
      ) : null}
    </aside>
  );
}
