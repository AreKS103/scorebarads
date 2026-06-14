"use client";

import { useCallback, useState } from "react";
import { ImagePlus, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { cn } from "@/lib/utils";
import type { UploadedImageAsset } from "@/lib/types";

interface ImageUploadZoneProps {
  label: string;
  slot: string;
  minWidth: number;
  minHeight: number;
  aspectLabel: string;
  images: UploadedImageAsset[];
  onChange: (images: UploadedImageAsset[]) => void;
}

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png"];

function readImageDimensions(file: File): Promise<{ width: number; height: number; previewUrl: string }> {
  return new Promise((resolve, reject) => {
    const previewUrl = URL.createObjectURL(file);
    const image = new window.Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight, previewUrl });
    image.onerror = () => {
      URL.revokeObjectURL(previewUrl);
      reject(new Error("Could not read image dimensions."));
    };
    image.src = previewUrl;
  });
}

export function ImageUploadZone({ label, slot, minWidth, minHeight, aspectLabel, images, onChange }: ImageUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  const uploadFiles = useCallback(
    async (fileList: FileList | File[]) => {
      setError("");
      const files = Array.from(fileList);

      for (const file of files) {
        if (!ACCEPTED.includes(file.type)) {
          setError("Upload JPG or PNG images only.");
          return;
        }

        if (file.size > MAX_BYTES) {
          setError("Image files must be under 5MB.");
          return;
        }

        const dimensions = await readImageDimensions(file);
        if (dimensions.width < minWidth || dimensions.height < minHeight) {
          URL.revokeObjectURL(dimensions.previewUrl);
          setError(`Minimum size is ${minWidth}x${minHeight}px.`);
          return;
        }

        setIsUploading(true);
        const body = new FormData();
        body.append("file", file);
        body.append("slot", slot);
        body.append("width", String(dimensions.width));
        body.append("height", String(dimensions.height));

        const response = await fetch("/api/google-ads/assets/upload", { method: "POST", body });
        const result = await response.json();
        setIsUploading(false);

        if (!response.ok || !result.success) {
          URL.revokeObjectURL(dimensions.previewUrl);
          setError(result.error || "Image upload failed.");
          return;
        }

        onChange([...images, { ...result.image, previewUrl: dimensions.previewUrl }]);
      }
    },
    [images, minHeight, minWidth, onChange, slot],
  );

  return (
    <div className="space-y-3">
      <div
        className={cn("flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/40 p-5 text-center transition-colors", isDragging && "border-primary bg-orange-50")}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          void uploadFiles(event.dataTransfer.files);
        }}
      >
        <UploadCloud className="mb-3 h-8 w-8 text-foreground" />
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="mt-1 text-xs text-muted-foreground">{aspectLabel}, minimum {minWidth}x{minHeight}px, JPG/PNG under 5MB</p>
        <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
          <ImagePlus className="h-4 w-4" />
          Choose image
          <input className="sr-only" type="file" accept="image/jpeg,image/png" multiple onChange={(event) => event.target.files && void uploadFiles(event.target.files)} />
        </label>
        {isUploading ? <div className="mt-3 flex items-center gap-2 text-sm text-foreground"><LoadingSpinner /> Uploading to Google Ads</div> : null}
        {error ? <p className="mt-3 text-sm font-medium text-red-600">{error}</p> : null}
      </div>

      {images.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((image) => (
            <div key={image.id} className="relative overflow-hidden rounded-lg border border-border bg-card">
              {image.previewUrl ? <div aria-label={image.fileName} className="h-28 w-full bg-cover bg-center" style={{ backgroundImage: `url(${image.previewUrl})` }} /> : <div className="h-28 bg-secondary" />}
              <div className="p-2 text-left">
                <p className="truncate text-xs font-semibold text-foreground">{image.fileName}</p>
                <p className="text-xs text-muted-foreground">{image.width}x{image.height}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1 h-7 w-7 bg-card/90"
                onClick={() => onChange(images.filter((candidate) => candidate.id !== image.id))}
                aria-label={`Remove ${image.fileName}`}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
