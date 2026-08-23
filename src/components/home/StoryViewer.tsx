"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import SmartImg from "@/components/SmartImg";
import type { Story } from "@/lib/data";

const VIEW_MS = 5000;

export default function StoryViewer({
  stories,
  startIndex,
  logo,
  onClose,
}: {
  stories: Story[];
  startIndex: number;
  logo?: string | undefined;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(startIndex);
  const [progress, setProgress] = useState(0);

  const next = useCallback(() => {
    setProgress(0);
    if (idx + 1 >= stories.length) onClose();
    else setIdx((v) => v + 1);
  }, [idx, stories.length, onClose]);

  const prev = useCallback(() => {
    setProgress(0);
    if (idx > 0) setIdx((v) => v - 1);
  }, [idx]);

  // auto-advance timer
  useEffect(() => {
    const t0 = Date.now();
    const tick = setInterval(() => {
      const p = Math.min(1, (Date.now() - t0) / VIEW_MS);
      setProgress(p);
      if (p >= 1) next();
    }, 50);
    return () => clearInterval(tick);
  }, [idx, next]);

  // esc to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const story = stories[idx];
  if (!story) return null;

  return (
    <div
      className="fixed inset-0 z-[90] bg-black flex flex-col select-none"
      role="dialog"
      aria-modal
      aria-label={`${story.name} story`}
    >
      {/* Progress bars */}
      <div className="absolute top-3 left-3 right-3 z-10 flex gap-1">
        {stories.map((s, i) => (
          <span key={s.id} className="h-[3px] flex-1 rounded-full bg-white/25 overflow-hidden">
            <span
              className="block h-full bg-white transition-[width] duration-75"
              style={{ width: i < idx ? "100%" : i === idx ? `${progress * 100}%` : "0%" }}
            />
          </span>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-8 left-4 right-4 z-10 flex items-center gap-2.5 text-white">
        <SmartImg
          src={logo ?? ""}
          alt=""
          eager
          className="w-9 h-9 rounded-full ring-1 ring-white/40 bg-gray-800"
          imgClassName="w-full h-full object-cover"
        />
        <Link href={`/restaurants/${story.restaurantId}`} onClick={onClose} className="min-w-0">
          <span className="block text-sm font-bold truncate">{story.name}</span>
          <span className="block text-[11px] text-white/60">Sponsored · Cravely</span>
        </Link>
        <button
          onClick={onClose}
          aria-label="Close story"
          className="ml-auto w-9 h-9 rounded-full bg-white/15 hover:bg-white/30 transition-colors flex items-center justify-center"
        >
          <i className="fa-solid fa-xmark" aria-hidden />
        </button>
      </div>

      {/* Image */}
      <div className="flex-1 relative">
        <SmartImg
          key={story.id}
          src={story.image}
          alt={story.caption ?? story.name}
          eager
          className="absolute inset-0"
          imgClassName="w-full h-full object-contain md:object-cover anim-pop"
        />
      </div>

      {/* Tap zones + caption */}
      {story.caption && (
        <div className="absolute bottom-20 left-5 right-5 z-10">
          <p className="text-white text-sm font-medium drop-shadow-lg bg-black/35 backdrop-blur-sm rounded-xl px-4 py-3 inline-block max-w-full">
            {story.caption}
          </p>
        </div>
      )}
      <button
        className="absolute inset-y-16 left-0 w-1/3 z-[5]"
        onClick={prev}
        aria-label="Previous"
      />
      <button
        className="absolute inset-y-16 right-0 w-1/2 z-[5]"
        onClick={next}
        aria-label="Next"
      />

      {/* Footer CTA */}
      <div className="absolute bottom-6 left-5 right-5 z-10">
        <Link
          href={`/restaurants/${story.restaurantId}`}
          onClick={onClose}
          className="flex items-center justify-center gap-2 w-full bg-white text-black rounded-full py-3 font-bold text-sm pressable"
        >
          <i className="fa-solid fa-store text-primary" aria-hidden />
          Visit {story.name}
        </Link>
      </div>
    </div>
  );
}
