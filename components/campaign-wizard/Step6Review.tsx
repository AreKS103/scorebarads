"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Save, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { CampaignTypeBadge, StatusBadge } from "@/components/shared/StatusBadge";
import { PushProgressModal } from "@/components/campaign-wizard/PushProgressModal";
import { campaignFormSchema } from "@/lib/validations";
import { dollarToMicros, microsToDollar } from "@/lib/google-ads/utils";
import { useWizardStore } from "@/lib/store";

function validCount(items: Array<{ text: string }>, max: number) {
  return items.filter((item) => item.text.trim().length > 0 && item.text.trim().length <= max).length;
}

export function Step6Review() {
  const { formData } = useWizardStore();
  const [pushOpen, setPushOpen] = useState(false);
  const [draftMessage, setDraftMessage] = useState("");
  const validation = useMemo(() => campaignFormSchema.safeParse(formData), [formData]);
  const estimatedReach = formData.keywords.ideas.reduce((sum, idea) => sum + (idea.selected ? idea.avgMonthlySearches : 0), 0);
  const warnings = useMemo(() => {
    const items: string[] = [];
    if (formData.campaignType === "SEARCH" && validCount(formData.creative.search.headlines, 30) < 5) {
      items.push("Search ads perform better with at least 5 varied headlines, even though Google requires 3.");
    }
    if (formData.campaignType === "SEARCH" && validCount(formData.creative.search.descriptions, 90) < 3) {
      items.push("Add a third RSA description for more serving combinations.");
    }
    if (formData.basics.launchStatus === "ENABLED") {
      items.push("This campaign will be enabled immediately after creation.");
    }
    if (formData.basics.dailyBudget >= 100) {
      items.push("Daily budget is high for a private local campaign; confirm the amount before pushing.");
    }
    return items;
  }, [formData]);

  async function saveDraft() {
    setDraftMessage("");
    const response = await fetch("/api/ad-drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    const result = await response.json().catch(() => ({}));

    setDraftMessage(response.ok && result.success ? "Draft saved." : result.error || "Draft save failed.");
  }

  return (
    <div className="space-y-5">
      <Card className="rounded-lg border border-border bg-card p-6">
        <CardHeader><CardTitle>Campaign Summary</CardTitle></CardHeader>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Campaign</p>
            <h3 className="text-sm font-medium text-foreground">{formData.basics.campaignName}</h3>
            <div className="flex gap-2"><CampaignTypeBadge type={formData.campaignType} /><StatusBadge status={formData.basics.launchStatus} /></div>
          </div>
          <div className="space-y-2 rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Budget and Dates</p>
            <p className="font-medium text-foreground">{microsToDollar(dollarToMicros(formData.basics.dailyBudget))} daily</p>
            <p className="text-sm text-muted-foreground">{formData.basics.startDate} to {formData.basics.endDate || "open end"}</p>
          </div>
          <div className="space-y-2 rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Targeting</p>
            <p className="font-medium text-foreground">{formData.targeting.locationPreset.replace("_", " ")}</p>
            <p className="text-sm text-muted-foreground">{formData.targeting.languages.join(", ")} | {formData.targeting.devices.join(", ")}</p>
          </div>
          <div className="space-y-2 rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Creative Assets</p>
            <p className="text-sm text-muted-foreground">Search headlines: {validCount(formData.creative.search.headlines, 30)} | Display images: {formData.creative.display.landscapeImages.length + formData.creative.display.squareImages.length} | PMax images: {formData.creative.performanceMax.landscapeImages.length + formData.creative.performanceMax.squareImages.length}</p>
          </div>
        </div>
      </Card>

      {estimatedReach > 0 ? <Card className="rounded-lg border border-border bg-card p-4 text-sm font-medium text-foreground">Estimated monthly keyword reach from selected ideas: {estimatedReach.toLocaleString()} searches.</Card> : null}

      {warnings.length > 0 ? (
        <Card className="rounded-lg border border-border bg-card p-4">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <div className="space-y-1 text-sm text-muted-foreground">
              {warnings.map((warning) => <p key={warning}>{warning}</p>)}
            </div>
          </div>
        </Card>
      ) : null}

      {!validation.success ? (
        <Card className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm font-medium text-destructive">Fix these before pushing:</p>
          <ul className="mt-2 space-y-1 text-sm text-destructive">
            {validation.error.issues.map((issue) => <li key={`${issue.path.join(".")}-${issue.message}`}>{issue.path.join(".")}: {issue.message}</li>)}
          </ul>
        </Card>
      ) : null}

      <div className="flex flex-wrap justify-end gap-3">
        <Button type="button" variant="ghost" onClick={saveDraft}><Save className="h-4 w-4" />Save as Draft</Button>
        <Button type="button" disabled={!validation.success} onClick={() => setPushOpen(true)}><Send className="h-4 w-4" />Push to Google Ads</Button>
      </div>
      {draftMessage ? <p className="text-right text-sm font-medium text-foreground">{draftMessage}</p> : null}
      <PushProgressModal open={pushOpen} onOpenChange={setPushOpen} formData={formData} />
    </div>
  );
}
