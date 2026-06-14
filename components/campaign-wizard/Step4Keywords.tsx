"use client";

import { useState } from "react";
import { Lightbulb, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { KeywordTable } from "@/components/shared/KeywordTable";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { useWizardStore } from "@/lib/store";
import type { CampaignKeywords, KeywordIdea, KeywordMatchType } from "@/lib/types";

export function Step4Keywords() {
  const { formData, updateSection, setKeywordIdeas } = useWizardStore();
  const [selectedIdeas, setSelectedIdeas] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [tipDismissed, setTipDismissed] = useState(false);
  const [error, setError] = useState("");
  const keywords = formData.keywords;
  const update = (patch: Partial<CampaignKeywords>) => updateSection("keywords", patch);

  if (formData.campaignType !== "SEARCH") {
    return <Card className="bg-muted/40 text-sm text-muted-foreground">Keyword targeting is skipped for {formData.campaignType.replace("_", " ")} campaigns.</Card>;
  }

  async function getIdeas() {
    setError("");
    setIsLoading(true);
    const seeds = keywords.rawKeywords.split(/\r?\n/).map((line) => line.replace(/[\[\]"]/g, "").trim()).filter(Boolean).slice(0, 20);
    const response = await fetch("/api/google-ads/keywords/ideas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keywords: seeds }),
    });
    const result = await response.json();
    setIsLoading(false);

    if (!response.ok || !result.success) {
      setError(result.error || "Keyword Planner request failed.");
      return;
    }

    setKeywordIdeas(result.ideas as KeywordIdea[]);
  }

  function addSelectedIdeas() {
    const additions = selectedIdeas.filter((keyword) => !keywords.rawKeywords.includes(keyword));
    update({ rawKeywords: [keywords.rawKeywords.trim(), ...additions].filter(Boolean).join("\n") });
    setSelectedIdeas([]);
  }

  return (
    <div className="space-y-5">
      {!tipDismissed ? (
        <Card className="border-orange-200 bg-orange-50 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3">
              <Lightbulb className="mt-0.5 h-5 w-5 text-primary" />
              <p className="text-sm text-foreground">Tip: Ask Perplexity AI to generate keyword ideas for your business, then paste them here.</p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => setTipDismissed(true)}>Dismiss</Button>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
        <div className="space-y-2">
          <Label>Keywords</Label>
          <Textarea value={keywords.rawKeywords} onChange={(event) => update({ rawKeywords: event.target.value })} className="min-h-56" />
          <p className="text-xs text-muted-foreground">One keyword per line. Use [exact match], &quot;phrase match&quot;, or broad match formatting per keyword.</p>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Match Type</Label>
            <Select value={keywords.matchType} onValueChange={(value) => update({ matchType: value as KeywordMatchType })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="BROAD">Broad</SelectItem>
                <SelectItem value="PHRASE">Phrase</SelectItem>
                <SelectItem value="EXACT">Exact</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Applied to lines that do not use bracket or quote syntax.</p>
          </div>
          <Button type="button" onClick={getIdeas} disabled={isLoading} className="w-full">
            {isLoading ? <LoadingSpinner /> : <Search className="h-4 w-4" />}
            Get Keyword Ideas
          </Button>
          {error ? <p className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-600">{error}</p> : null}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Negative Keywords</Label>
        <Textarea value={keywords.negativeKeywords} onChange={(event) => update({ negativeKeywords: event.target.value })} className="min-h-32" />
        <p className="text-xs text-muted-foreground">Negative keywords are sent as AdGroupCriterion entries with negative set to true.</p>
      </div>

      <KeywordTable
        ideas={keywords.ideas}
        selected={selectedIdeas}
        onToggle={(keyword) => setSelectedIdeas((current) => (current.includes(keyword) ? current.filter((item) => item !== keyword) : [...current, keyword]))}
        onAddSelected={addSelectedIdeas}
      />
    </div>
  );
}
