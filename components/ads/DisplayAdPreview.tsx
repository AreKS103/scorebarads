"use client";

import type { DisplayCreative, UploadedImageAsset } from "@/lib/types";

interface DisplayAdPreviewProps {
  creative: DisplayCreative;
  image?: UploadedImageAsset;
}

export function DisplayAdPreview({ creative, image }: DisplayAdPreviewProps) {
  const headline = creative.headlines.find((item) => item.text.trim())?.text || "Live Sports Tonight";
  const description = creative.descriptions.find((item) => item.text.trim())?.text || "Big screens, cold drinks and match-night atmosphere.";

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="relative h-40 bg-secondary">
        {image?.previewUrl ? <div aria-label={image.fileName} className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${image.previewUrl})` }} /> : <div className="flex h-full items-center justify-center text-sm font-semibold text-foreground">Score Bar image preview</div>}
      </div>
      <div className="p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{creative.businessName || "Score Bar"}</p>
        <h4 className="mt-1 text-sm font-medium leading-snug text-foreground">{headline}</h4>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <div className="mt-4 inline-flex h-8 items-center rounded-md border border-border px-3 text-sm font-medium text-foreground">Visit site</div>
      </div>
    </div>
  );
}
