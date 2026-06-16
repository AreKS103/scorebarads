"use client";

import { useEffect, useMemo, useState } from "react";
import type { SearchCreative } from "@/lib/types";

interface RSAPreviewProps {
  creative: SearchCreative;
}

export function RSAPreview({ creative }: RSAPreviewProps) {
  const [index, setIndex] = useState(0);
  const headlines = useMemo(() => creative.headlines.map((headline) => headline.text.trim()).filter(Boolean), [creative.headlines]);
  const descriptions = useMemo(() => creative.descriptions.map((description) => description.text.trim()).filter(Boolean), [creative.descriptions]);

  useEffect(() => {
    const timer = window.setInterval(() => setIndex((current) => current + 1), 2500);
    return () => window.clearInterval(timer);
  }, []);

  const activeHeadlines = headlines.length > 0 ? [headlines[index % headlines.length], headlines[(index + 1) % headlines.length], headlines[(index + 2) % headlines.length]].filter(Boolean) : ["Score Bar Phnom Penh", "Live Sports Tonight"];
  const activeDescription = descriptions[index % Math.max(descriptions.length, 1)] || "Watch the biggest matches live with food, drinks and big screens.";
  const url = creative.finalUrl || "https://scorebarphnompenh.com";
  const path = [creative.path1, creative.path2].filter(Boolean).join("/");

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">Sponsored</p>
      <p className="mt-1 text-sm text-green-700">{url.replace(/^https?:\/\//, "")}{path ? `/${path}` : ""}</p>
      <h4 className="mt-1 text-xl font-medium leading-snug text-blue-700">{activeHeadlines.join(" | ")}</h4>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{activeDescription}</p>
    </div>
  );
}
