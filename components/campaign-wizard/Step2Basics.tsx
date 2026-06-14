"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useWizardStore } from "@/lib/store";
import type { CampaignBasics } from "@/lib/types";

function Field({ label, help, children }: { label: string; help: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}<p className="text-xs text-muted-foreground">{help}</p></div>;
}

export function Step2Basics() {
  const { formData, updateSection } = useWizardStore();
  const basics = formData.basics;
  const update = (patch: Partial<CampaignBasics>) => updateSection("basics", patch);

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <Field label="Campaign Name" help="Use a clear internal naming pattern, for example WC2026 Search - Mexico Match.">
        <Input value={basics.campaignName} onChange={(event) => update({ campaignName: event.target.value })} />
      </Field>
      <Field label="Match Event" help="Optional context for reporting and drafts.">
        <Input value={basics.matchEvent || ""} onChange={(event) => update({ matchEvent: event.target.value })} placeholder="Mexico vs South Africa - June 12" />
      </Field>
      <Field label="Daily Budget ($)" help="Google Ads receives this as micros, one dollar equals 1,000,000 micros.">
        <Input type="number" min="1" step="1" value={basics.dailyBudget} onChange={(event) => update({ dailyBudget: Number(event.target.value) })} />
      </Field>
      <Field label="Lifetime Budget" help="When enabled, this budget is saved with the campaign draft and summary.">
        <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2">
          <span className="text-sm font-medium text-foreground">Use lifetime budget</span>
          <Switch checked={basics.lifetimeBudgetEnabled} onCheckedChange={(checked) => update({ lifetimeBudgetEnabled: checked })} />
        </div>
      </Field>
      {basics.lifetimeBudgetEnabled ? (
        <Field label="Lifetime Budget ($)" help="Use a fixed campaign budget for a short event window.">
          <Input type="number" min="1" value={basics.lifetimeBudget || ""} onChange={(event) => update({ lifetimeBudget: Number(event.target.value) })} />
        </Field>
      ) : null}
      <Field label="Bidding Strategy" help="Maximize Clicks is usually safest for match-night traffic campaigns.">
        <Select value={basics.biddingStrategy} onValueChange={(value) => update({ biddingStrategy: value as CampaignBasics["biddingStrategy"] })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="MANUAL_CPC">Manual CPC</SelectItem>
            <SelectItem value="MAXIMIZE_CLICKS">Maximize Clicks</SelectItem>
            <SelectItem value="TARGET_CPA">Target CPA</SelectItem>
            <SelectItem value="TARGET_ROAS">Target ROAS</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      {basics.biddingStrategy === "TARGET_CPA" ? (
        <Field label="Target CPA ($)" help="The desired conversion cost Google Ads should optimize toward.">
          <Input type="number" min="1" step="0.01" value={basics.targetCpa || ""} onChange={(event) => update({ targetCpa: Number(event.target.value) })} />
        </Field>
      ) : null}
      {basics.biddingStrategy === "TARGET_ROAS" ? (
        <Field label="Target ROAS" help="Use a multiplier such as 3.5 for 350% return on ad spend.">
          <Input type="number" min="0.1" step="0.1" value={basics.targetRoas || ""} onChange={(event) => update({ targetRoas: Number(event.target.value) })} />
        </Field>
      ) : null}
      <Field label="Start Date" help="Google Ads requires YYYYMMDD, stored here as a local date.">
        <Input type="date" value={basics.startDate} onChange={(event) => update({ startDate: event.target.value })} />
      </Field>
      <Field label="End Date" help="Optional, but recommended for short match campaigns.">
        <Input type="date" value={basics.endDate || ""} onChange={(event) => update({ endDate: event.target.value })} />
      </Field>
      <Field label="Status on Launch" help="Paused is the default so campaigns never go live accidentally.">
        <Select value={basics.launchStatus} onValueChange={(value) => update({ launchStatus: value as CampaignBasics["launchStatus"] })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="PAUSED">Paused</SelectItem>
            <SelectItem value="ENABLED">Enabled</SelectItem>
          </SelectContent>
        </Select>
      </Field>
    </div>
  );
}
