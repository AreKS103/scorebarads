"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, ExternalLink, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import type { CampaignFormData, PushProgressEvent } from "@/lib/types";

const orderedSteps = ["budget", "campaign", "criteria", "adGroup", "keywords", "assets", "ad", "complete"];
const stepLabels: Record<string, string> = {
  budget: "Creating budget",
  campaign: "Creating campaign",
  criteria: "Adding targeting",
  adGroup: "Creating ad group",
  keywords: "Adding keywords",
  assets: "Uploading images",
  ad: "Creating ad",
  complete: "Campaign live",
};

interface PushProgressModalProps {
  open: boolean;
  formData: CampaignFormData;
  onOpenChange: (open: boolean) => void;
}

export function PushProgressModal({ open, formData, onOpenChange }: PushProgressModalProps) {
  const router = useRouter();
  const [events, setEvents] = useState<PushProgressEvent[]>([]);
  const [hasStarted, setHasStarted] = useState(false);
  const startGuard = useRef(false);
  const latestByStep = useMemo(() => new Map(events.map((event) => [event.step, event])), [events]);
  const complete = latestByStep.get("complete")?.status === "success";
  const error = latestByStep.get("error");
  const progress = Math.min(100, Math.round((events.filter((event) => event.status === "success" || event.status === "skipped").length / orderedSteps.length) * 100));

  useEffect(() => {
    if (!open || startGuard.current) {
      return;
    }

    startGuard.current = true;
    setHasStarted(true);
    setEvents([]);

    async function runPush() {
      const response = await fetch("/api/google-ads/campaigns/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok || !response.body) {
        const body = await response.json().catch(() => ({ error: "Campaign push failed." }));
        setEvents([{ step: "error", status: "error", message: body.error || "Campaign push failed." }]);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() || "";

        for (const chunk of chunks) {
          const line = chunk.split("\n").find((item) => item.startsWith("data: "));
          if (!line) {
            continue;
          }
          const event = JSON.parse(line.slice(6)) as PushProgressEvent;
          setEvents((current) => [...current, event]);
        }
      }
    }

    void runPush();
  }, [formData, open]);

  function close() {
    onOpenChange(false);
    startGuard.current = false;
    setHasStarted(false);
    if (complete) {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Push to Google Ads</DialogTitle>
          <DialogDescription>Each Google Ads API step reports as it completes.</DialogDescription>
        </DialogHeader>
        <Progress value={progress} />
        <div className="space-y-3">
          {orderedSteps.map((step) => {
            const event = latestByStep.get(step);
            const status = event?.status || "pending";
            return (
              <div key={step} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 text-sm">
                {status === "success" || status === "skipped" ? <CheckCircle2 className="h-4 w-4 text-muted-foreground" /> : status === "running" ? <LoadingSpinner className="text-muted-foreground" /> : status === "error" ? <XCircle className="h-4 w-4 text-destructive" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                <div>
                  <p className="font-semibold text-foreground">{stepLabels[step]}</p>
                  <p className="text-muted-foreground">{event?.message || "Waiting"}</p>
                </div>
              </div>
            );
          })}
        </div>
        {error ? <div className="rounded-lg border border-border bg-card p-4 text-sm text-destructive"><strong>Failed:</strong> {error.message}<pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify(error.data, null, 2)}</pre></div> : null}
        <div className="flex flex-wrap justify-end gap-2">
          {complete ? <Button variant="ghost" asChild><a href="https://ads.google.com/aw/campaigns" target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" />View in Google Ads</a></Button> : null}
          <Button onClick={close} disabled={hasStarted && !complete && !error}>{complete ? "Go to dashboard" : error ? "Close" : "Working"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
