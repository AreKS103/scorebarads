import type { SupabaseClient } from "@supabase/supabase-js";
import { callGoogleAdsAPI, getGoogleAdsAuthContext } from "@/lib/google-ads/auth";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png"];

export function validateImageFile(file: File) {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Upload a JPG or PNG image. Google Ads image assets do not accept this file type here.");
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Image files must be under 5MB.");
  }
}

export async function uploadImageToSupabase(supabase: SupabaseClient, userId: string, file: File, slot: string) {
  validateImageFile(file);
  const extension = file.name.split(".").pop()?.toLowerCase() || "png";
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
  const path = `${userId}/${slot}/${Date.now()}-${safeName}.${extension}`;
  const { error } = await supabase.storage.from("campaign-assets").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    throw new Error(error.message);
  }

  return path;
}

export async function uploadImageAsset(userId: string, file: File) {
  validateImageFile(file);
  const auth = await getGoogleAdsAuthContext(userId);
  const bytes = Buffer.from(await file.arrayBuffer());
  const response = await callGoogleAdsAPI(
    "assets:mutate",
    "POST",
    {
      operations: [
        {
          create: {
            type: "IMAGE",
            imageAsset: {
              data: bytes.toString("base64"),
            },
          },
        },
      ],
    },
    auth.accessToken,
    auth.developerToken,
    auth.customerId,
    auth.managerCustomerId,
  );

  return response.results?.[0]?.resourceName as string;
}

export async function uploadStoredAssetBytes(userId: string, data: ArrayBuffer) {
  const auth = await getGoogleAdsAuthContext(userId);
  const response = await callGoogleAdsAPI(
    "assets:mutate",
    "POST",
    {
      operations: [
        {
          create: {
            type: "IMAGE",
            imageAsset: {
              data: Buffer.from(data).toString("base64"),
            },
          },
        },
      ],
    },
    auth.accessToken,
    auth.developerToken,
    auth.customerId,
    auth.managerCustomerId,
  );

  return response.results?.[0]?.resourceName as string;
}
