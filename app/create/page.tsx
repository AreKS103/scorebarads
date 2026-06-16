"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, CheckCircle2, ClipboardList, Layers, ShieldCheck, Sparkles } from "lucide-react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { AppHeader } from "@/components/shared/AppHeader";
import { LivePreviewPanel } from "@/components/campaign-wizard/LivePreviewPanel";
import { Step1CampaignType } from "@/components/campaign-wizard/Step1CampaignType";
import { Step2Basics } from "@/components/campaign-wizard/Step2Basics";
import { Step3Targeting } from "@/components/campaign-wizard/Step3Targeting";
import { Step4Keywords } from "@/components/campaign-wizard/Step4Keywords";
import { Step5Creative } from "@/components/campaign-wizard/Step5Creative";
import { Step6Review } from "@/components/campaign-wizard/Step6Review";
import { StepIndicator } from "@/components/campaign-wizard/StepIndicator";
import { basicsSchema, campaignFormSchema, targetingSchema } from "@/lib/validations";
import { useWizardStore } from "@/lib/store";

const titles: Record<number, string> = {
  1: "Campaign Type",
  2: "Campaign Basics",
  3: "Targeting",
  4: "Keywords",
  5: "Ad Creative",
  6: "Review & Push",
};

const workflowNotes = [
  "Start with intent: Search for people looking now, visual formats for awareness.",
  "Keep launch paused unless the budget, dates, assets, and landing URL are verified.",
  "Use enough creative variation so Google can test combinations without weakening relevance.",
  "Review customer ID, manager ID, developer token access, and OAuth before pushing.",
];

function countValid(items: Array<{ text: string }>, max: number) {
  return items.filter((item) => item.text.trim().length > 0 && item.text.trim().length <= max).length;
}

function CampaignWorkflowRail() {
  const { currentStep, formData, setStep } = useWizardStore();
  const keywordCount = formData.keywords.rawKeywords.split(/\r?\n/).filter((line) => line.trim()).length;
  const headlineCount = countValid(formData.creative.search.headlines, 30);
  const descriptionCount = countValid(formData.creative.search.descriptions, 90);
  const enabledSchedule = formData.targeting.adSchedule.filter((block) => block.enabled).length;
  const checks = [
    { label: "Budget set", done: formData.basics.dailyBudget > 0 },
    { label: "Targeting focused", done: formData.targeting.languages.length > 0 && formData.targeting.devices.length > 0 },
    { label: "Schedule selected", done: enabledSchedule > 0 },
    { label: "Search assets strong", done: formData.campaignType !== "SEARCH" || (headlineCount >= 5 && descriptionCount >= 2 && keywordCount >= 1) },
  ];

  return (
    <aside className="hidden space-y-4 xl:block">
      <Card className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Workflow</h2>
        </div>
        <div className="mt-4 space-y-1">
          {Object.entries(titles).map(([step, title]) => {
            const stepNumber = Number(step);
            const active = currentStep === stepNumber;
            return (
              <button
                key={step}
                type="button"
                onClick={() => setStep(stepNumber)}
                className={`flex h-8 w-full items-center justify-between rounded-sm px-2 text-left text-sm transition-colors ${active ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`}
              >
                <span>{step}. {title}</span>
                {stepNumber < currentStep ? <CheckCircle2 className="h-4 w-4" /> : null}
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Launch checks</h2>
        </div>
        <div className="mt-4 space-y-3">
          {checks.map((check) => (
            <div key={check.label} className="flex items-center gap-2 text-sm">
              <CheckCircle2 className={`h-4 w-4 ${check.done ? "text-green-600" : "text-muted-foreground"}`} />
              <span className={check.done ? "text-foreground" : "text-muted-foreground"}>{check.label}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Best-practice notes</h2>
        </div>
        <ul className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
          {workflowNotes.map((note) => <li key={note} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground" />{note}</li>)}
        </ul>
      </Card>

      <Card className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">API push sequence</h2>
        </div>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li>Budget</li>
          <li>Campaign shell</li>
          <li>Location, language, schedule criteria</li>
          <li>Ad group and keywords</li>
          <li>Assets and ad creation</li>
        </ol>
      </Card>
    </aside>
  );
}

export default function CreateCampaignPage() {
  const { currentStep, setStep, formData } = useWizardStore();
  const [error, setError] = useState("");
  const form = useForm<z.input<typeof campaignFormSchema>, unknown, z.output<typeof campaignFormSchema>>({
    resolver: zodResolver(campaignFormSchema),
    values: formData as z.input<typeof campaignFormSchema>,
    mode: "onChange",
  });

  useEffect(() => {
    form.reset(formData as z.input<typeof campaignFormSchema>);
  }, [form, formData]);

  function validateCurrentStep() {
    if (currentStep === 2) {
      const result = basicsSchema.safeParse(formData.basics);
      return result.success ? "" : result.error.issues[0]?.message || "Check campaign basics.";
    }

    if (currentStep === 3) {
      const result = targetingSchema.safeParse(formData.targeting);
      return result.success ? "" : result.error.issues[0]?.message || "Check targeting.";
    }

    if (currentStep >= 5) {
      const result = campaignFormSchema.safeParse(formData);
      return result.success ? "" : result.error.issues[0]?.message || "Check campaign settings.";
    }

    return "";
  }

  function nextStep() {
    const message = validateCurrentStep();
    if (message) {
      setError(message);
      return;
    }

    setError("");
    if (currentStep === 3 && formData.campaignType !== "SEARCH") {
      setStep(5);
      return;
    }
    setStep(currentStep + 1);
  }

  function previousStep() {
    setError("");
    if (currentStep === 5 && formData.campaignType !== "SEARCH") {
      setStep(3);
      return;
    }
    setStep(currentStep - 1);
  }

  return (
    <div className="min-h-screen bg-background lg:pl-[240px]">
      <AppHeader />
      <main className="px-6 py-6">
      <div className="mx-auto max-w-screen-xl space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Score Ads Manager</p>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">New Campaign</h1>
          </div>
          <Button variant="ghost" asChild><Link href="/dashboard"><ArrowLeft className="h-4 w-4" />Dashboard</Link></Button>
        </div>

        <StepIndicator currentStep={currentStep} onStepClick={setStep} />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px] xl:grid-cols-[260px_minmax(0,1fr)_420px]">
          <CampaignWorkflowRail />
          <Card className="min-w-0 rounded-lg border border-border bg-card p-6">
            <CardHeader><CardTitle>{titles[currentStep]}</CardTitle></CardHeader>
            <form onSubmit={form.handleSubmit(() => setStep(6))} className="space-y-6">
              {currentStep === 1 ? <Step1CampaignType /> : null}
              {currentStep === 2 ? <Step2Basics /> : null}
              {currentStep === 3 ? <Step3Targeting /> : null}
              {currentStep === 4 ? <Step4Keywords /> : null}
              {currentStep === 5 ? <Step5Creative /> : null}
              {currentStep === 6 ? <Step6Review /> : null}
              {error ? <p className="rounded-lg border border-border bg-card p-3 text-xs font-medium text-destructive">{error}</p> : null}
              <div className="mt-6 flex flex-wrap justify-between gap-3 border-t border-border pt-6">
                <Button type="button" variant="ghost" onClick={previousStep} disabled={currentStep === 1}><ArrowLeft className="h-4 w-4" />Back</Button>
                {currentStep < 6 ? <Button type="button" onClick={nextStep}>Next<ArrowRight className="h-4 w-4" /></Button> : null}
              </div>
            </form>
          </Card>
          <div className="hidden lg:block"><LivePreviewPanel /></div>
        </div>
      </div>
      </main>
    </div>
  );
}
