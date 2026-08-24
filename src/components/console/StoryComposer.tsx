"use client";

import { useEffect, useRef, useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { uploadImage } from "@/lib/storage";

/**
 * Instagram-style story composer: pick a photo → crop/zoom in a 9:16 frame →
 * overlay text (top/middle/bottom) → publish. Renders the final 1080×1920
 * JPEG client-side, uploads to R2.
 */
export default function StoryComposer({
  restaurantId,
  restaurantName,
  onClose,
  onPublished,
}: {
  restaurantId: string;
  restaurantName: string;
  onClose: () => void;
  onPublished: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offsetY, setOffsetY] = useState(0);
  const [text, setText] = useState("");
  const [textPos, setTextPos] = useState<"top" | "middle" | "bottom">("bottom");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const W = 1080;
  const H = 1920;

  useEffect(() => {
    if (!file) return;
    const image = new Image();
    image.onload = () => setImg(image);
    image.src = URL.createObjectURL(file);
    return () => URL.revokeObjectURL(image.src);
  }, [file]);

  // draw preview
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);

    // cover-fit with zoom + vertical pan
    const scale = Math.max(W / img.width, H / img.height) * zoom;
    const dw = img.width * scale;
    const dh = img.height * scale;
    const dx = (W - dw) / 2;
    const maxPan = Math.max(0, (dh - H) / 2);
    const dy = (H - dh) / 2 + offsetY * maxPan;
    ctx.drawImage(img, dx, dy, dw, dh);

    if (text.trim()) {
      const fontSize = 64;
      ctx.font = `700 ${fontSize}px "Segoe UI", sans-serif`;
      ctx.textAlign = "center";
      const lines = wrapText(ctx, text.trim(), W - 160);
      const lineHeight = fontSize * 1.3;
      const blockH = lines.length * lineHeight;
      let y =
        textPos === "top"
          ? 220 + fontSize
          : textPos === "middle"
            ? H / 2 - blockH / 2 + fontSize
            : H - 320 - blockH + fontSize;
      for (const line of lines) {
        ctx.shadowColor = "rgba(0,0,0,0.7)";
        ctx.shadowBlur = 16;
        ctx.fillStyle = "#fff";
        ctx.fillText(line, W / 2, y);
        ctx.shadowBlur = 0;
        y += lineHeight;
      }
    }
  }, [img, zoom, offsetY, text, textPos]);

  async function publish() {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), "image/jpeg", 0.85),
      );
      if (!blob) throw new Error("render");
      const file = new File([blob], "story.jpg", { type: "image/jpeg" });
      const url = await uploadImage(file, "story", restaurantId);
      await addDoc(collection(getDb()!, "stories"), {
        restaurantId,
        name: restaurantName,
        image: url,
        caption: text.trim(),
        createdAt: serverTimestamp(),
      });
      onPublished();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Publish failed. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[120] bg-black flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label="Create story"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <span className="font-bold text-sm">Add to story</span>
        <button
          onClick={onClose}
          aria-label="Close"
          className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/30 transition-colors"
        >
          <i className="fa-solid fa-xmark" aria-hidden />
        </button>
      </div>

      {/* Stage */}
      <div className="flex-1 flex items-center justify-center px-6 min-h-0">
        {!img ? (
          <label className="w-full max-w-[300px] aspect-[9/16] rounded-2xl border-2 border-dashed border-white/25 flex flex-col items-center justify-center gap-3 text-white/70 cursor-pointer hover:border-primary transition-colors">
            {busy ? (
              <i className="fa-solid fa-spinner fa-spin text-3xl" aria-hidden />
            ) : (
              <>
                <i className="fa-solid fa-camera text-4xl" aria-hidden />
                <span className="text-sm font-medium">Choose a photo</span>
                <span className="text-[11px]">Portrait works best</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
        ) : (
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="max-h-full max-w-full rounded-xl object-contain"
          />
        )}
      </div>

      {/* Controls */}
      {img && (
        <div className="px-5 pb-6 pt-3 space-y-3 bg-black">
          {error && (
            <p className="rounded-lg bg-red-500/20 text-red-300 px-3 py-2 text-xs">
              {error}
            </p>
          )}
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add text…"
            maxLength={120}
            className="w-full rounded-full bg-white/10 text-white placeholder-white/40 px-4 py-2.5 text-sm outline-none focus:bg-white/15 transition-colors"
          />
          <div className="flex gap-2 justify-center">
            {(["top", "middle", "bottom"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setTextPos(p)}
                className={`text-[11px] font-semibold px-3 py-1.5 rounded-full transition-colors ${
                  textPos === p ? "bg-white text-black" : "bg-white/10 text-white/70"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-3 text-[11px] text-white/60">
            <i className="fa-solid fa-magnifying-glass-plus" aria-hidden />
            Zoom
            <input
              type="range"
              min={1}
              max={2.5}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-primary"
            />
          </label>
          <label className="flex items-center gap-3 text-[11px] text-white/60">
            <i className="fa-solid fa-arrows-up-down" aria-hidden />
            Pan
            <input
              type="range"
              min={-1}
              max={1}
              step={0.05}
              value={offsetY}
              onChange={(e) => setOffsetY(Number(e.target.value))}
              className="flex-1 accent-primary"
            />
          </label>
          <button
            onClick={() => void publish()}
            disabled={busy}
            className="w-full bg-primary text-white rounded-full py-3 font-bold text-sm disabled:opacity-50 pressable"
          >
            {busy ? "Publishing…" : "Share to story"}
          </button>
        </div>
      )}
    </div>
  );
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines.slice(0, 6);
}
