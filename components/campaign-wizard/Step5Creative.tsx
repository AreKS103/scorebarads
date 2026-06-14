"use client";

import { useState } from "react";
import { Lightbulb } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { CharCounter } from "@/components/shared/CharCounter";
import { ImageUploadZone } from "@/components/shared/ImageUploadZone";
import { DisplayAdPreview } from "@/components/ads/DisplayAdPreview";
import { RSAPreview } from "@/components/ads/RSAPreview";
import { useWizardStore } from "@/lib/store";
import type { CampaignCreative, TextAssetInput } from "@/lib/types";

function Field({ label, help, children }: { label: string; help: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label}</Label>{children}<p className="text-xs text-muted-foreground">{help}</p></div>;
}

function TextAssetInputs({ items, labelPrefix, limit, onChange, allowPin = false }: { items: TextAssetInput[]; labelPrefix: string; limit: number; onChange: (items: TextAssetInput[]) => void; allowPin?: boolean }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item, index) => (
        <div key={`${labelPrefix}-${index}`} className="space-y-2 rounded-lg border border-border bg-card p-3">
          <div className="flex items-center justify-between gap-2">
            <Label>{labelPrefix}{index + 1}</Label>
            <CharCounter value={item.text} limit={limit} />
          </div>
          <Input value={item.text} onChange={(event) => {
            const next = items.slice();
            next[index] = { ...item, text: event.target.value };
            onChange(next);
          }} />
          {allowPin ? (
            <Select value={item.pinnedField || "NONE"} onValueChange={(value) => {
              const next = items.slice();
              next[index] = { ...item, pinnedField: value === "NONE" ? "" : value as TextAssetInput["pinnedField"] };
              onChange(next);
            }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">No pin</SelectItem>
                <SelectItem value="HEADLINE_1">Pin H1</SelectItem>
                <SelectItem value="HEADLINE_2">Pin H2</SelectItem>
                <SelectItem value="HEADLINE_3">Pin H3</SelectItem>
              </SelectContent>
            </Select>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function Step5Creative() {
  const { formData, updateSection } = useWizardStore();
  const [activeTab, setActiveTab] = useState(formData.campaignType === "PERFORMANCE_MAX" ? "pmax" : formData.campaignType.toLowerCase());
  const creative = formData.creative;
  const updateCreative = (patch: Partial<CampaignCreative>) => updateSection("creative", patch);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
      <TabsList className="flex w-full flex-wrap justify-start gap-1">
        <TabsTrigger value="search">Search RSA</TabsTrigger>
        <TabsTrigger value="display">Display</TabsTrigger>
        <TabsTrigger value="pmax">Performance Max</TabsTrigger>
        <TabsTrigger value="video">YouTube Video</TabsTrigger>
        <TabsTrigger value="demand_gen">Demand Gen</TabsTrigger>
      </TabsList>

      <TabsContent value="search" className="space-y-5">
        <Card className="border-orange-200 bg-orange-50 p-4 text-sm text-foreground"><Lightbulb className="mr-2 inline h-4 w-4 text-primary" />Paste this into Perplexity: Write 10 Google Ads headlines (max 30 chars) and 3 descriptions (max 90 chars) for Score Sports Bar & Grill in Phnom Penh.</Card>
        <TextAssetInputs items={creative.search.headlines} labelPrefix="H" limit={30} allowPin onChange={(headlines) => updateCreative({ search: { ...creative.search, headlines } })} />
        <TextAssetInputs items={creative.search.descriptions} labelPrefix="D" limit={90} onChange={(descriptions) => updateCreative({ search: { ...creative.search, descriptions } })} />
        <div className="grid gap-5 md:grid-cols-3">
          <Field label="Final URL" help="Landing page users reach after clicking the ad."><Input value={creative.search.finalUrl} onChange={(event) => updateCreative({ search: { ...creative.search, finalUrl: event.target.value } })} /></Field>
          <Field label="Display Path 1" help="Optional display URL path, 15 characters max."><Input maxLength={15} value={creative.search.path1 || ""} onChange={(event) => updateCreative({ search: { ...creative.search, path1: event.target.value } })} /></Field>
          <Field label="Display Path 2" help="Optional display URL path, 15 characters max."><Input maxLength={15} value={creative.search.path2 || ""} onChange={(event) => updateCreative({ search: { ...creative.search, path2: event.target.value } })} /></Field>
        </div>
        <RSAPreview creative={creative.search} />
      </TabsContent>

      <TabsContent value="display" className="space-y-5">
        <div className="grid gap-5 xl:grid-cols-2">
          <ImageUploadZone label="Landscape image" slot="display-landscape" minWidth={600} minHeight={314} aspectLabel="1.91:1" images={creative.display.landscapeImages} onChange={(landscapeImages) => updateCreative({ display: { ...creative.display, landscapeImages } })} />
          <ImageUploadZone label="Square image" slot="display-square" minWidth={300} minHeight={300} aspectLabel="1:1" images={creative.display.squareImages} onChange={(squareImages) => updateCreative({ display: { ...creative.display, squareImages } })} />
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Business Name" help="Responsive Display Ads limit business names to 25 characters."><Input maxLength={25} value={creative.display.businessName} onChange={(event) => updateCreative({ display: { ...creative.display, businessName: event.target.value } })} /></Field>
          <Field label="Final URL" help="The display ad landing page."><Input value={creative.display.finalUrl} onChange={(event) => updateCreative({ display: { ...creative.display, finalUrl: event.target.value } })} /></Field>
        </div>
        <TextAssetInputs items={creative.display.headlines} labelPrefix="H" limit={30} onChange={(headlines) => updateCreative({ display: { ...creative.display, headlines } })} />
        <Field label="Long Headline" help="Shown in larger placements, 90 characters max."><div className="flex gap-2"><Input value={creative.display.longHeadline} onChange={(event) => updateCreative({ display: { ...creative.display, longHeadline: event.target.value } })} /><CharCounter value={creative.display.longHeadline} limit={90} /></div></Field>
        <TextAssetInputs items={creative.display.descriptions} labelPrefix="D" limit={90} onChange={(descriptions) => updateCreative({ display: { ...creative.display, descriptions } })} />
        <DisplayAdPreview creative={creative.display} image={creative.display.landscapeImages[0]} />
      </TabsContent>

      <TabsContent value="pmax" className="space-y-5">
        <div className="grid gap-5 xl:grid-cols-3">
          <ImageUploadZone label="PMax landscape" slot="pmax-landscape" minWidth={600} minHeight={314} aspectLabel="1.91:1" images={creative.performanceMax.landscapeImages} onChange={(landscapeImages) => updateCreative({ performanceMax: { ...creative.performanceMax, landscapeImages } })} />
          <ImageUploadZone label="PMax square" slot="pmax-square" minWidth={300} minHeight={300} aspectLabel="1:1" images={creative.performanceMax.squareImages} onChange={(squareImages) => updateCreative({ performanceMax: { ...creative.performanceMax, squareImages } })} />
          <ImageUploadZone label="Logo" slot="pmax-logo" minWidth={128} minHeight={128} aspectLabel="logo" images={creative.performanceMax.logoImages} onChange={(logoImages) => updateCreative({ performanceMax: { ...creative.performanceMax, logoImages } })} />
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          <Field label="Business Name" help="Shown with PMax assets, 25 characters max."><Input maxLength={25} value={creative.performanceMax.businessName} onChange={(event) => updateCreative({ performanceMax: { ...creative.performanceMax, businessName: event.target.value } })} /></Field>
          <Field label="YouTube Video URL" help="Optional YouTube asset for PMax inventory."><Input value={creative.performanceMax.youtubeVideoUrl || ""} onChange={(event) => updateCreative({ performanceMax: { ...creative.performanceMax, youtubeVideoUrl: event.target.value } })} /></Field>
          <Field label="Final URL" help="The landing page used by the asset group."><Input value={creative.performanceMax.finalUrl} onChange={(event) => updateCreative({ performanceMax: { ...creative.performanceMax, finalUrl: event.target.value } })} /></Field>
        </div>
        <TextAssetInputs items={creative.performanceMax.headlines} labelPrefix="H" limit={30} onChange={(headlines) => updateCreative({ performanceMax: { ...creative.performanceMax, headlines } })} />
        <TextAssetInputs items={creative.performanceMax.longHeadlines} labelPrefix="LH" limit={90} onChange={(longHeadlines) => updateCreative({ performanceMax: { ...creative.performanceMax, longHeadlines } })} />
        <TextAssetInputs items={creative.performanceMax.descriptions} labelPrefix="D" limit={90} onChange={(descriptions) => updateCreative({ performanceMax: { ...creative.performanceMax, descriptions } })} />
      </TabsContent>

      <TabsContent value="video" className="space-y-5">
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="YouTube Video URL" help="Accepts youtube.com, youtu.be, embed URLs, shorts URLs, or a video ID."><Input value={creative.video.youtubeVideoUrl} onChange={(event) => updateCreative({ video: { ...creative.video, youtubeVideoUrl: event.target.value } })} /></Field>
          <Field label="In-stream Ad Type" help="Skippable in-stream is enabled for this private app."><Input value="Skippable in-stream" disabled /></Field>
          <Field label="Headline" help="Video headline, 30 characters max."><div className="flex gap-2"><Input maxLength={30} value={creative.video.headline} onChange={(event) => updateCreative({ video: { ...creative.video, headline: event.target.value } })} /><CharCounter value={creative.video.headline} limit={30} /></div></Field>
          <Field label="CTA Button" help="Short call-to-action label, 10 characters max."><Input maxLength={10} value={creative.video.ctaText} onChange={(event) => updateCreative({ video: { ...creative.video, ctaText: event.target.value } })} /></Field>
          <Field label="Final URL" help="Landing page for the video ad."><Input value={creative.video.finalUrl} onChange={(event) => updateCreative({ video: { ...creative.video, finalUrl: event.target.value } })} /></Field>
          <Field label="Display URL" help="Clean URL shown in the ad."><Input value={creative.video.displayUrl} onChange={(event) => updateCreative({ video: { ...creative.video, displayUrl: event.target.value } })} /></Field>
        </div>
        <Field label="Description" help="Video ad description, 90 characters max."><Textarea value={creative.video.description} onChange={(event) => updateCreative({ video: { ...creative.video, description: event.target.value } })} /><CharCounter value={creative.video.description} limit={90} /></Field>
      </TabsContent>

      <TabsContent value="demand_gen" className="space-y-5">
        <div className="grid gap-5 xl:grid-cols-2">
          <ImageUploadZone label="Demand Gen landscape" slot="demand-landscape" minWidth={600} minHeight={314} aspectLabel="1.91:1" images={creative.demandGen.landscapeImages} onChange={(landscapeImages) => updateCreative({ demandGen: { ...creative.demandGen, landscapeImages } })} />
          <ImageUploadZone label="Demand Gen square" slot="demand-square" minWidth={300} minHeight={300} aspectLabel="1:1" images={creative.demandGen.squareImages} onChange={(squareImages) => updateCreative({ demandGen: { ...creative.demandGen, squareImages } })} />
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          <Field label="Business Name" help="Demand Gen business name, 25 characters max."><Input maxLength={25} value={creative.demandGen.businessName} onChange={(event) => updateCreative({ demandGen: { ...creative.demandGen, businessName: event.target.value } })} /></Field>
          <Field label="CTA Text" help="Optional call-to-action label, 10 characters max."><Input maxLength={10} value={creative.demandGen.ctaText || ""} onChange={(event) => updateCreative({ demandGen: { ...creative.demandGen, ctaText: event.target.value } })} /></Field>
          <Field label="Final URL" help="Landing page for Demand Gen traffic."><Input value={creative.demandGen.finalUrl} onChange={(event) => updateCreative({ demandGen: { ...creative.demandGen, finalUrl: event.target.value } })} /></Field>
        </div>
        <TextAssetInputs items={creative.demandGen.headlines} labelPrefix="H" limit={30} onChange={(headlines) => updateCreative({ demandGen: { ...creative.demandGen, headlines } })} />
        <TextAssetInputs items={creative.demandGen.descriptions} labelPrefix="D" limit={90} onChange={(descriptions) => updateCreative({ demandGen: { ...creative.demandGen, descriptions } })} />
      </TabsContent>
    </Tabs>
  );
}
