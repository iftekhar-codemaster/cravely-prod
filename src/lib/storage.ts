"use client";

import { getFirebaseAuth } from "./firebase";

export type UploadKind = "food" | "story" | "logo" | "cover" | "offer";

/**
 * Compresses an image in-browser (max 1200px, JPEG ~82%) and uploads it to
 * Cloudflare R2 via /api/upload. Returns the public URL.
 * Falls back with a friendly error when R2 env vars are not configured yet.
 */
export async function uploadImage(
  file: File,
  kind: UploadKind,
  restaurantId: string,
): Promise<string> {
  const auth = getFirebaseAuth();
  if (!auth?.currentUser) throw new Error("Sign in to upload images.");
  const idToken = await auth.currentUser.getIdToken();

  const compressed = await compressImage(file);
  const form = new FormData();
  form.append("file", compressed, "image.jpg");
  form.append("kind", kind);
  form.append("restaurantId", restaurantId);

  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { authorization: `Bearer ${idToken}` },
    body: form,
  });
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !data.url) {
    throw new Error(data.error ?? "Upload failed. Try again.");
  }
  return data.url;
}

async function compressImage(file: File, max = 1200, quality = 0.82): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", quality),
    );
    if (!blob) return file;
    return new File([blob], "image.jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}
