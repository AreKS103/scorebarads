"use client";

import { MonitorPlay, Search, Sparkles, Trophy, Video, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useWizardStore } from "@/lib/store";
import type { CampaignType } from "@/lib/types";

const types: Array<{ type: CampaignType; name: string; description: string; icon: typeof Search; recommended?: boolean }> = [
  { type: "SEARCH", name: "Search", description: "Capture people actively looking for live sports and match nights.", icon: Search, recommended: true },
  { type: "DISPLAY", name: "Display", description: "Show image ads across sites and apps for event awareness.", icon: MonitorPlay, recommended: true },
  { type: "PERFORMANCE_MAX", name: "Performance Max", description: "Run across Google channels with one asset group.", icon: Zap },
  { type: "VIDEO", name: "YouTube Video", description: "Promote match-night clips and venue energy on YouTube.", icon: Video },
  { type: "DEMAND_GEN", name: "Demand Gen", description: "Reach YouTube, Gmail and Discover audiences visually.", icon: Sparkles },
];

export function Step1CampaignType() {
  const { formData, setCampaignType } = useWizardStore();

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      {types.map((item) => {
        const selected = formData.campaignType === item.type;
        return (
          <button key={item.type} type="button" onClick={() => setCampaignType(item.type)} className="text-left">
            <Card className={cn("h-full rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/50", selected && "bg-accent text-accent-foreground")}> 
              <div className="flex items-start justify-between gap-3">
                <item.icon className="h-4 w-4 text-muted-foreground" />
                {item.recommended ? <Badge variant="default"><Trophy className="mr-1 h-3 w-3" />World Cup</Badge> : null}
              </div>
              <h3 className="mt-4 text-sm font-medium text-foreground">{item.name}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
            </Card>
          </button>
        );
      })}
    </div>
  );
}
