"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import { AppHeader } from "@/components/shared/AppHeader";
import { PerformanceChart } from "@/components/dashboard/PerformanceChart";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CampaignTypeBadge, StatusBadge } from "@/components/shared/StatusBadge";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { formatPercent } from "@/lib/utils";
import { microsToDollar } from "@/lib/google-ads/utils";
import type { CampaignReportPoint, KeywordMatchType } from "@/lib/types";

interface DetailPayload {
  campaign: { resourceName: string; name: string; status: "ENABLED" | "PAUSED" | "REMOVED"; type: string; budgetResourceName: string; budgetMicros: number } | null;
  adGroups: Array<{ resourceName: string; name: string; status: string; impressions: number; clicks: number; ctr: number; avgCpcMicros: number }>;
  keywords: Array<{ resourceName: string; adGroupResourceName: string; adGroupName: string; text: string; matchType: KeywordMatchType; qualityScore: number; status: string; impressions: number; clicks: number; ctr: number; avgCpcMicros: number }>;
  ads: Array<{ resourceName: string; adGroupName: string; status: string; type: string; impressions: number; clicks: number; ctr: number; avgCpcMicros: number }>;
}

export default function CampaignDetailPage({ params }: { params: { id: string } }) {
  const campaignResourceName = decodeURIComponent(params.id);
  const encodedId = encodeURIComponent(campaignResourceName);
  const [report, setReport] = useState<CampaignReportPoint[]>([]);
  const [detail, setDetail] = useState<DetailPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [budgetDollars, setBudgetDollars] = useState("");
  const [newKeyword, setNewKeyword] = useState("");
  const [matchType, setMatchType] = useState<KeywordMatchType>("PHRASE");
  const firstAdGroup = detail?.adGroups[0]?.resourceName;
  const totalClicks = useMemo(() => report.reduce((sum, point) => sum + point.clicks, 0), [report]);

  const load = useCallback(async () => {
    setError("");
    setIsLoading(true);
    const [reportResponse, detailResponse] = await Promise.all([
      fetch(`/api/google-ads/campaigns/${encodedId}/report`, { cache: "no-store" }),
      fetch(`/api/google-ads/campaigns/${encodedId}/detail`, { cache: "no-store" }),
    ]);
    const [reportBody, detailBody] = await Promise.all([reportResponse.json(), detailResponse.json()]);
    setIsLoading(false);

    if (!reportResponse.ok || !detailResponse.ok) {
      setError(reportBody.error || detailBody.error || "Could not load campaign detail.");
      return;
    }

    setReport(reportBody.report || []);
    setDetail(detailBody as DetailPayload);
    if (detailBody.campaign?.budgetMicros) {
      setBudgetDollars(String(detailBody.campaign.budgetMicros / 1_000_000));
    }
  }, [encodedId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleStatus() {
    if (!detail?.campaign) return;
    const nextStatus = detail.campaign.status === "ENABLED" ? "PAUSED" : "ENABLED";
    const response = await fetch(`/api/google-ads/campaigns/${encodedId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      setError(result.error || "Status update failed.");
      return;
    }
    setDetail({ ...detail, campaign: { ...detail.campaign, status: nextStatus } });
  }

  async function saveBudget() {
    if (!detail?.campaign?.budgetResourceName) return;
    const response = await fetch(`/api/google-ads/campaigns/${encodedId}/budget`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ budgetResourceName: detail.campaign.budgetResourceName, dollars: Number(budgetDollars) }),
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      setError(result.error || "Budget update failed.");
      return;
    }
    await load();
  }

  async function addKeyword() {
    if (!newKeyword.trim()) return;
    const response = await fetch(`/api/google-ads/campaigns/${encodedId}/keywords`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyword: newKeyword, matchType, adGroupResourceName: firstAdGroup }),
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      setError(result.error || "Keyword add failed.");
      return;
    }
    setNewKeyword("");
    await load();
  }

  async function removeKeyword(criterionResourceName: string) {
    const response = await fetch(`/api/google-ads/campaigns/${encodedId}/keywords`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ criterionResourceName }),
    });
    const result = await response.json();
    if (!response.ok || !result.success) {
      setError(result.error || "Keyword remove failed.");
      return;
    }
    await load();
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 lg:px-8">
        <Button variant="secondary" asChild><Link href="/dashboard"><ArrowLeft className="h-4 w-4" />Dashboard</Link></Button>
        {isLoading ? <Card className="flex items-center gap-3"><LoadingSpinner className="text-primary" />Loading campaign detail...</Card> : null}
        {error ? <Card className="border-red-200 bg-red-50 text-sm font-medium text-red-700">{error}</Card> : null}

        {detail?.campaign ? (
          <>
            <Card>
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap gap-2"><CampaignTypeBadge type={detail.campaign.type} /><StatusBadge status={detail.campaign.status} /></div>
                  <h1 className="mt-3 text-3xl font-bold text-foreground">{detail.campaign.name}</h1>
                  <p className="mt-2 text-sm text-muted-foreground">{campaignResourceName}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={toggleStatus}>{detail.campaign.status === "ENABLED" ? "Pause Campaign" : "Enable Campaign"}</Button>
                </div>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-lg bg-muted/40 p-4"><p className="text-xs uppercase text-muted-foreground">Budget</p><p className="text-xl font-bold text-foreground">{microsToDollar(detail.campaign.budgetMicros)}</p></div>
                <div className="rounded-lg bg-muted/40 p-4"><p className="text-xs uppercase text-muted-foreground">30-day clicks</p><p className="text-xl font-bold text-foreground">{totalClicks.toLocaleString()}</p></div>
                <div className="rounded-lg bg-muted/40 p-4"><p className="text-xs uppercase text-muted-foreground">Ad groups</p><p className="text-xl font-bold text-foreground">{detail.adGroups.length}</p></div>
              </div>
            </Card>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-foreground">Performance</h2>
              <PerformanceChart data={report} />
            </section>

            <Card>
              <CardHeader><CardTitle>Edit Budget</CardTitle></CardHeader>
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <div className="space-y-2"><Label>Daily Budget ($)</Label><Input type="number" min="1" value={budgetDollars} onChange={(event) => setBudgetDollars(event.target.value)} /></div>
                <Button className="self-end" onClick={saveBudget}><Save className="h-4 w-4" />Save Budget</Button>
              </div>
            </Card>

            <Card>
              <CardHeader><CardTitle>Ad Groups</CardTitle></CardHeader>
              <div className="space-y-3">
                {detail.adGroups.map((group) => (
                  <details key={group.resourceName} className="rounded-lg border border-border bg-muted/40 p-4" open>
                    <summary className="cursor-pointer font-semibold text-foreground">{group.name} <StatusBadge status={group.status} /></summary>
                    <div className="mt-3 grid gap-3 text-sm sm:grid-cols-4"><span>Impressions {group.impressions.toLocaleString()}</span><span>Clicks {group.clicks.toLocaleString()}</span><span>CTR {formatPercent(group.ctr)}</span><span>Avg CPC {microsToDollar(group.avgCpcMicros)}</span></div>
                  </details>
                ))}
                {detail.adGroups.length === 0 ? <p className="text-sm text-muted-foreground">No ad groups returned for this campaign.</p> : null}
              </div>
            </Card>

            <Card>
              <CardHeader><CardTitle>Keywords</CardTitle></CardHeader>
              <div className="mb-5 grid gap-3 md:grid-cols-[1fr_180px_auto]">
                <Input value={newKeyword} onChange={(event) => setNewKeyword(event.target.value)} placeholder="sports bar tonight" />
                <Select value={matchType} onValueChange={(value) => setMatchType(value as KeywordMatchType)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="BROAD">Broad</SelectItem><SelectItem value="PHRASE">Phrase</SelectItem><SelectItem value="EXACT">Exact</SelectItem></SelectContent></Select>
                <Button onClick={addKeyword}><Plus className="h-4 w-4" />Add Keyword</Button>
              </div>
              <div className="overflow-auto rounded-lg border border-border">
                <table className="w-full min-w-[780px] text-left text-sm">
                  <thead className="bg-secondary text-xs uppercase text-foreground"><tr><th className="px-3 py-2">Keyword</th><th className="px-3 py-2">Match</th><th className="px-3 py-2">Quality</th><th className="px-3 py-2">Impr.</th><th className="px-3 py-2">Clicks</th><th className="px-3 py-2">CTR</th><th className="px-3 py-2">Avg CPC</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Remove</th></tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {detail.keywords.map((keyword) => (
                      <tr key={keyword.resourceName}><td className="px-3 py-2 font-medium">{keyword.text}</td><td className="px-3 py-2">{keyword.matchType}</td><td className="px-3 py-2">{keyword.qualityScore || "-"}</td><td className="px-3 py-2">{keyword.impressions.toLocaleString()}</td><td className="px-3 py-2">{keyword.clicks.toLocaleString()}</td><td className="px-3 py-2">{formatPercent(keyword.ctr)}</td><td className="px-3 py-2">{microsToDollar(keyword.avgCpcMicros)}</td><td className="px-3 py-2"><StatusBadge status={keyword.status} /></td><td className="px-3 py-2"><Button variant="ghost" size="icon" onClick={() => void removeKeyword(keyword.resourceName)} aria-label={`Remove ${keyword.text}`}><Trash2 className="h-4 w-4" /></Button></td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card>
              <CardHeader><CardTitle>Ads</CardTitle></CardHeader>
              <div className="grid gap-3 md:grid-cols-2">
                {detail.ads.map((ad) => (
                  <div key={ad.resourceName} className="rounded-lg border border-border bg-muted/40 p-4">
                    <div className="flex items-center justify-between gap-3"><p className="font-semibold text-foreground">{ad.type}</p><StatusBadge status={ad.status} /></div>
                    <p className="mt-2 text-sm text-muted-foreground">{ad.adGroupName}</p>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-sm"><span>{ad.impressions.toLocaleString()} impr.</span><span>{ad.clicks.toLocaleString()} clicks</span><span>{formatPercent(ad.ctr)} CTR</span></div>
                  </div>
                ))}
                {detail.ads.length === 0 ? <p className="text-sm text-muted-foreground">No ads returned for this campaign.</p> : null}
              </div>
            </Card>
          </>
        ) : !isLoading ? <Card>Campaign was not found in the connected Google Ads account.</Card> : null}
      </main>
    </div>
  );
}
