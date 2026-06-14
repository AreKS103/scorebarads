"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const steps = ["Type", "Basics", "Targeting", "Keywords", "Creative", "Review"];

interface StepIndicatorProps {
  currentStep: number;
  onStepClick: (step: number) => void;
}

export function StepIndicator({ currentStep, onStepClick }: StepIndicatorProps) {
  return (
    <nav aria-label="Campaign builder progress" className="rounded-xl border border-border bg-card p-3">
      <ol className="grid gap-2 md:grid-cols-6">
        {steps.map((label, index) => {
          const step = index + 1;
          const isComplete = step < currentStep;
          const isActive = step === currentStep;
          return (
            <li key={label}>
              <button
                type="button"
                onClick={() => onStepClick(step)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors",
                  isActive && "bg-primary text-primary-foreground",
                  isComplete && !isActive && "bg-orange-50 text-primary",
                  !isActive && !isComplete && "bg-muted/40 text-muted-foreground hover:bg-secondary",
                )}
              >
                <span className={cn("flex h-6 w-6 items-center justify-center rounded-full border text-xs", isActive ? "border-white" : "border-current")}>{isComplete ? <Check className="h-4 w-4" /> : step}</span>
                <span className="truncate">{label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
