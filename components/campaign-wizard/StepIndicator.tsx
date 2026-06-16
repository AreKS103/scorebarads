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
    <nav aria-label="Campaign builder progress" className="rounded-lg border border-border bg-card p-2">
      <ol className="grid gap-1 md:grid-cols-6">
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
                  "flex h-8 w-full items-center gap-2 rounded-sm px-2 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                  isActive && "bg-accent font-medium text-accent-foreground",
                )}
              >
                <span className="flex h-5 w-5 items-center justify-center text-xs text-muted-foreground">{isComplete ? <Check className="h-4 w-4" /> : step}</span>
                <span className="truncate">{label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
