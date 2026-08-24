"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import SmartImg from "@/components/SmartImg";
import type { Story } from "@/lib/data";

const VIEW_MS = 5000;

export default function StoryViewer({
  stories,
  startIndex,
  logo,
  onSeen,
  onClose,
}: {
  stories: Story[];
  startIndex: number;
  logo?: string | undefined;
  onSeen?: (storyId: string) => void;
  onClose: () => void;
}) {  const [idx, setIdx] = useState(startIndex);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [mounted, setMounted] = useState(false);

  const next = useCallback(() => {
    setProgress(0);
    if (idx + 1 >= stories.length) onClose();
    else setIdx((v) => v + 1);
  }, [idx, stories.length, onClose]);

  const prev = useCallback(() => {
    setProgress(0);
    if (idx > 0) setIdx((v) => v - 1);
  }, [idx]);

  // enter animation + lock body scroll while open
  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // auto-advance (pausable)
  useEffect(() => {
    if (paused) return;
    const t0 = Date.now();
    const base = progress * VIEW_MS;
    const tick = setInterval(() => {
      const p = Math.min(1, (base + (Date.now() - t0)) / VIEW_MS);
      setProgress(p);
      if (p >= 1) next();
    }, 50);
    return () => clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, next, paused]);

  // keyboard controls
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
      if (e.key === " ") setPaused((p) => !p);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, next, prev]);

  // preload next image + mark current as seen
  useEffect(() => {
    const cur = stories[idx];
    if (cur) onSeen?.(cur.id);
    const nxt = stories[idx + 1];
    if (nxt) {
      const img = new Image();
      img.src = nxt.image;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, stories]);

  const story = stories[idx];
  if (!story || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[200] bg-black flex flex-col select-none transition-[opacity,transform] duration-300 ease-out ${
        mounted ? "opacity-100 scale-100" : "opacity-0 scale-[1.04]"
      }`}
      role="dialog"
      aria-modal="true"
      aria-label={`${story.name} story`}
    >
      {/* Progress bars */}
      <div className="absolute top-3 left-3 right-3 z-20 flex gap-1">
        {stories.map((s, i) => (
          <span key={s.id} className="h-[3px] flex-1 rounded-full bg-white/25 overflow-hidden">
            <span
              className="block h-full bg-white"
              style={{
                width: i < idx ? "100%" : i === idx ? `${progress * 100}%` : "0%",
                transition: i === idx ? "width 75ms linear" : "none",
              }}
            />
          </span>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-8 left-4 right-4 z-20 flex items-center gap-2.5 text-white">
        <SmartImg
          src={logo ?? ""}
          alt=""
          eager
          className="w-9 h-9 rounded-full ring-1 ring-white/40 bg-gray-800"
          imgClassName="w-full h-full object-cover"
        />
        <Link href={`/restaurants/${story.restaurantId}`} onClick={onClose} className="min-w-0">
          <span className="block text-sm font-bold truncate">{story.name}</span>
          <span className="block text-[11px] text-white/60">Tap to visit</span>
        </Link>
        <button
          onClick={onClose}
          aria-label="Close story"
          className="ml-auto w-9 h-9 rounded-full bg-white/15 hover:bg-white/30 transition-colors flex items-center justify-center"
        >
          <i className="fa-solid fa-xmark" aria-hidden />
        </button>
      </div>

      {/* Image stage */}
      <div className="flex-1 relative bg-neutral-950">
        <SmartImg
          key={story.id}
          src={story.image}
          alt={story.caption ?? story.name}
          eager
          className="absolute inset-0"
          imgClassName="w-full h-full object-contain sm:object-cover"
        />

        {/* Caption */}
        {story.caption && (
          <div className="absolute bottom-24 left-5 right-5 z-10 text-center">
            <p className="text-white text-sm font-medium drop-shadow-lg bg-black/40 backdrop-blur-sm rounded-xl px-4 py-3 inline-block max-w-full">
              {story.caption}
            </p>
          </div>
        )}

        {/* Tap zones (below header, above footer) */}
        <button
          className="absolute inset-y-14 left-0 w-1/3 cursor-pointer"
          onClick={prev}
          onPointerDown={() => setPaused(true)}
          onPointerUp={() => setPaused(false)}
          aria-label="Previous"
        />
        <button
          className="absolute inset-y-14 right-0 w-1/2 cursor-pointer"
          onClick={next}
          onPointerDown={() => setPaused(true)}
          onPointerUp={() => setPaused(false)}
          aria-label="Next"
        />
      </div>

      {/* Footer CTA */}
      <div className="absolute bottom-6 left-5 right-5 z-20">
        <Link
          href={`/restaurants/${story.restaurantId}`}
          onClick={onClose}
          className="flex items-center justify-center gap-2 w-full bg-white text-black rounded-full py-3 font-bold text-sm pressable"
        >
          <i className="fa-solid fa-store text-primary" aria-hidden />
          Visit {story.name}
        </Link>
      </div>
    </div>,
    document.body,
  );
}
