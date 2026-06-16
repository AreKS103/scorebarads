"use client";

import { useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, DollarSign, MapPin, Monitor, Smartphone, Tablet, Target } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CampaignTypeBadge, StatusBadge } from "@/components/shared/StatusBadge";
import { microsToDollar, dollarToMicros } from "@/lib/google-ads/utils";
import { useWizardStore } from "@/lib/store";
import type { CampaignFormData, UploadedImageAsset } from "@/lib/types";

type Device = "phone" | "tablet" | "desktop";

const deviceConfig: Record<Device, { label: string; icon: typeof Smartphone; width: string; frame: string }> = {
  phone: { label: "Phone", icon: Smartphone, width: "w-[290px]", frame: "rounded-[2rem]" },
  tablet: { label: "Tablet", icon: Tablet, width: "w-[360px]", frame: "rounded-[1.5rem]" },
  desktop: { label: "Desktop", icon: Monitor, width: "w-full", frame: "rounded-lg" },
};

function textItems(items: Array<{ text: string }>, fallback: string[]) {
  const values = items.map((item) => item.text.trim()).filter(Boolean);
  return values.length > 0 ? values : fallback;
}

function firstImage(images: UploadedImageAsset[]) {
  return images.find((image) => image.previewUrl)?.previewUrl;
}

function scoreCreativeDepth(formData: CampaignFormData) {
  const searchHeadlines = textItems(formData.creative.search.headlines, []).filter((item) => item.length <= 30).length;
  const searchDescriptions = textItems(formData.creative.search.descriptions, []).filter((item) => item.length <= 90).length;
  const activeSchedule = formData.targeting.adSchedule.filter((item) => item.enabled).length;
  const base = 30;
  const score = base
    + Math.min(25, searchHeadlines * 3)
    + Math.min(15, searchDescriptions * 5)
    + Math.min(10, formData.keywords.rawKeywords.split(/\r?\n/).filter(Boolean).length)
    + Math.min(10, formData.targeting.languages.length * 3)
    + Math.min(10, activeSchedule * 2);
  return Math.min(100, score);
}

function GoogleSearchPreview({ formData, device }: { formData: CampaignFormData; device: Device }) {
  const creative = formData.creative.search;
  const headlines = textItems(creative.headlines, ["Score Bar Phnom Penh", "Watch Live Sports", "Cold Beer Big Screens"]);
  const descriptions = textItems(creative.descriptions, ["Catch every big match at Score Sports Bar & Grill in Phnom Penh."]);
  const url = (creative.finalUrl || "https://scorebarphnompenh.com").replace(/^https?:\/\//, "");
  const path = [creative.path1, creative.path2].filter(Boolean).join("/");
  const visibleHeadlines = device === "phone" ? headlines.slice(0, 2) : headlines.slice(0, 3);

  return (
    <div className="space-y-3 bg-background p-4 text-left">
      <div className="rounded-lg border border-border bg-card p-3">
        <p className="text-xs text-muted-foreground">Sponsored</p>
        <p className="mt-1 truncate text-sm text-green-700">{url}{path ? `/${path}` : ""}</p>
        <h4 className="mt-1 text-lg font-medium leading-snug text-blue-700">{visibleHeadlines.join(" | ")}</h4>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{descriptions[0]}</p>
        {device !== "phone" ? <p className="mt-1 text-sm leading-6 text-muted-foreground">{descriptions[1] || descriptions[0]}</p> : null}
      </div>
      <div className="rounded-lg border border-dashed border-border bg-card p-3 text-xs text-muted-foreground">Organic result preview area</div>
    </div>
  );
}

function GoogleImagePreview({ formData, device }: { formData: CampaignFormData; device: Device }) {
  const isDisplay = formData.campaignType === "DISPLAY";
  const creative = isDisplay ? formData.creative.display : formData.campaignType === "DEMAND_GEN" ? formData.creative.demandGen : formData.creative.performanceMax;
  const headline = textItems(creative.headlines, ["Live Sports Tonight"])[0];
  const description = textItems(creative.descriptions, ["Big screens, cold drinks and match-night atmosphere."])[0];
  const businessName = creative.businessName || "Score Bar";
  const image = firstImage("landscapeImages" in creative ? creative.landscapeImages : []);

  return (
    <div className="bg-background p-4">
      <div className={`overflow-hidden rounded-lg border border-border bg-card text-left ${device === "desktop" ? "max-w-xl" : ""}`}>
        <div className={`${device === "phone" ? "h-36" : "h-44"} bg-secondary`}>
          {image ? <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${image})` }} /> : <div className="flex h-full items-center justify-center text-sm font-semibold text-muted-foreground">Image asset preview</div>}
        </div>
        <div className="space-y-2 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sponsored · {businessName}</p>
          <h4 className="text-lg font-bold leading-snug text-foreground">{headline}</h4>
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
          <div className="inline-flex h-8 items-center rounded-md border border-border px-3 text-sm font-medium text-foreground">Visit site</div>
        </div>
      </div>
    </div>
  );
}

function YouTubePreview({ formData, device }: { formData: CampaignFormData; device: Device }) {
  const creative = formData.creative.video;
  return (
    <div className="bg-background p-4">
      <div className="overflow-hidden rounded-lg border border-border bg-card text-left">
        <div className={`${device === "phone" ? "h-36" : "h-48"} flex items-center justify-center bg-black text-white`}>
          <div className="text-center">
            <div className="mx-auto mb-3 h-10 w-14 rounded-lg bg-red-600" />
            <p className="text-xs text-white/70">YouTube video placement</p>
          </div>
        </div>
        <div className="p-4">
          <p className="text-xs text-muted-foreground">Sponsored · Score Bar</p>
          <h4 className="mt-1 text-lg font-bold text-foreground">{creative.headline || "Watch Live Sports"}</h4>
          <p className="mt-2 text-sm text-muted-foreground">{creative.description || "Join match night at Score Bar Phnom Penh."}</p>
          <div className="mt-4 inline-flex h-8 items-center rounded-md border border-border px-3 text-sm font-medium text-foreground">{creative.ctaText || "Book Now"}</div>
        </div>
      </div>
    </div>
  );
}

function PlacementPreview({ formData, device }: { formData: CampaignFormData; device: Device }) {
  if (formData.campaignType === "SEARCH") return <GoogleSearchPreview formData={formData} device={device} />;
  if (formData.campaignType === "VIDEO") return <YouTubePreview formData={formData} device={device} />;
  return <GoogleImagePreview formData={formData} device={device} />;
}

export function LivePreviewPanel() {
  const { formData } = useWizardStore();
  const [device, setDevice] = useState<Device>("phone");
  const location = formData.targeting.locationPreset.replace("_", " ");
  const config = deviceConfig[device];
  const qualityScore = useMemo(() => scoreCreativeDepth(formData), [formData]);

  return (
    <aside className="sticky top-6 space-y-4">
      <Card className="rounded-lg border border-border bg-card p-4">
        <CardHeader className="mb-4">
          <CardTitle>Launch Brief</CardTitle>
        </CardHeader>
        <div className="space-y-4">
          <div>
            <div className="flex flex-wrap gap-2"><CampaignTypeBadge type={formData.campaignType} /><StatusBadge status={formData.basics.launchStatus} /></div>
            <h3 className="mt-3 text-sm font-medium text-foreground">{formData.basics.campaignName || "Untitled campaign"}</h3>
            {formData.basics.matchEvent ? <p className="mt-1 text-sm text-muted-foreground">{formData.basics.matchEvent}</p> : null}
          </div>
          <div className="grid gap-3 text-sm">
            <div className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-muted-foreground" />{microsToDollar(dollarToMicros(formData.basics.dailyBudget))} daily</div>
            <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" />{location}</div>
            <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-muted-foreground" />{formData.basics.startDate} to {formData.basics.endDate || "open end"}</div>
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-foreground">Best-practice readiness</span>
              <span className="font-medium tabular-nums text-foreground">{qualityScore}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-foreground" style={{ width: `${qualityScore}%` }} />
            </div>
          </div>
        </div>
      </Card>

      <Card className="rounded-lg border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Google-style preview</p>
            <h3 className="text-sm font-medium text-foreground">Placement simulator</h3>
          </div>
          <Target className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="mb-4 grid grid-cols-3 gap-2">
          {(Object.keys(deviceConfig) as Device[]).map((item) => {
            const Icon = deviceConfig[item].icon;
            return (
              <Button key={item} type="button" variant={device === item ? "default" : "ghost"} size="sm" onClick={() => setDevice(item)}>
                <Icon className="h-4 w-4" />{deviceConfig[item].label}
              </Button>
            );
          })}
        </div>
        <div className="overflow-x-auto rounded-lg border border-border bg-card p-3">
          <div className={`${config.width} mx-auto border border-border bg-background ${config.frame}`}>
            <div className="flex items-center justify-between border-b border-border px-4 py-2 text-xs text-muted-foreground">
              <span>{config.label}</span>
              <span>Google preview</span>
            </div>
            <PlacementPreview formData={formData} device={device} />
          </div>
        </div>
        <div className="mt-4 space-y-2 text-xs text-muted-foreground">
          <p className="flex gap-2"><CheckCircle2 className="h-4 w-4 text-green-600" />Preview uses live form assets and Google Ads text limits.</p>
          <p>Final rendering can vary by auction, device, assets, and Google placement.</p>
        </div>
      </Card>
    </aside>
  );
}
