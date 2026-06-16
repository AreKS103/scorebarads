import { NextRequest } from "next/server";
import { jsonError, jsonSuccess, requireUser } from "@/lib/api";
import { uploadImageAsset, uploadImageToSupabase, validateImageFile } from "@/lib/google-ads/assets";
import { withCsrfCheck } from "@/lib/security";
import { createServiceClient } from "@/lib/supabase/server";

export const POST = withCsrfCheck(async function POST(request: NextRequest) {
  try {
    const { user } = await requireUser();
    const formData = await request.formData();
    const file = formData.get("file");
    const slot = String(formData.get("slot") || "image");
    const width = Number(formData.get("width") || 0);
    const height = Number(formData.get("height") || 0);

    if (!(file instanceof File)) {
      throw new Error("Missing image file upload.");
    }

    validateImageFile(file);
    const storagePath = await uploadImageToSupabase(createServiceClient(), user.id, file, slot);
    const assetResourceName = await uploadImageAsset(user.id, file);

    return jsonSuccess({
      image: {
        id: crypto.randomUUID(),
        fileName: file.name,
        storagePath,
        assetResourceName,
        width,
        height,
        mimeType: file.type,
      },
    });
  } catch (error) {
    return jsonError(error, 400);
  }
});
