"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight } from "lucide-react";
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
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="px-4 py-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">Score Ads Manager</p>
            <h1 className="text-3xl font-bold text-foreground">New Campaign</h1>
          </div>
          <Button variant="secondary" asChild><Link href="/dashboard"><ArrowLeft className="h-4 w-4" />Dashboard</Link></Button>
        </div>

        <StepIndicator currentStep={currentStep} onStepClick={setStep} />

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Card className="min-w-0">
            <CardHeader><CardTitle>{titles[currentStep]}</CardTitle></CardHeader>
            <form onSubmit={form.handleSubmit(() => setStep(6))} className="space-y-6">
              {currentStep === 1 ? <Step1CampaignType /> : null}
              {currentStep === 2 ? <Step2Basics /> : null}
              {currentStep === 3 ? <Step3Targeting /> : null}
              {currentStep === 4 ? <Step4Keywords /> : null}
              {currentStep === 5 ? <Step5Creative /> : null}
              {currentStep === 6 ? <Step6Review /> : null}
              {error ? <p className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-600">{error}</p> : null}
              <div className="flex flex-wrap justify-between gap-3 border-t border-border pt-5">
                <Button type="button" variant="secondary" onClick={previousStep} disabled={currentStep === 1}><ArrowLeft className="h-4 w-4" />Back</Button>
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
