"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { addToPackage, toggleLiked, getLiked, getPackage } from "@/lib/store";

export default function ProductActions({ foodId }: { foodId: string }) {
  const router = useRouter();
  const [liked, setLiked] = useState(false);
  const [inPackage, setInPackage] = useState(false);

  useEffect(() => {
    // deferred so we don't call setState synchronously inside the effect
    const t = setTimeout(() => {
      setLiked(getLiked().includes(foodId));
      setInPackage(getPackage().includes(foodId));
    }, 0);
    return () => clearTimeout(t);
  }, [foodId]);

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2.5rem)] max-w-[calc(28rem-2.5rem)] bg-white border-t border-line rounded-[30px] px-2 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.12)]">
      <div className="flex justify-between items-center px-1">
        <button className="flex flex-col items-center gap-1 text-text-light hover:text-foreground transition-colors w-1/4 text-text-light">
          <i className="fa-solid fa-calendar-clock w-5" aria-hidden />
          <span className="text-[10px] font-medium text-center leading-tight">Pre order</span>
        </button>

        <button
          onClick={() => {
            const added = addToPackage(foodId);
            setInPackage(added);
          }}
          aria-pressed={inPackage}
          className={`flex flex-col items-center gap-1 transition-colors w-1/4 ${
            inPackage ? "text-primary" : "text-blue-600 hover:text-blue-700"
          }`}
        >
          <i className={inPackage ? "fa-solid fa-circle-check w-5" : "fa-solid fa-circle-plus w-5"} aria-hidden />
          <span className="text-[10px] font-medium text-center leading-tight">
            {inPackage ? "In package" : "Add to package"}
          </span>
        </button>

        <button
          onClick={() => setLiked(toggleLiked(foodId))}
          aria-pressed={liked}
          aria-label="Save to liked"
          className={`flex flex-col items-center gap-1 transition-colors w-1/4 ${
            liked ? "text-primary" : "text-text-light hover:text-primary"
          }`}
        >
          <i className={`${liked ? "fa-solid" : "fa-regular"} fa-heart w-5`} aria-hidden />
          <span className="text-[10px] font-medium text-center leading-tight">Eatater</span>
        </button>

        <button
          onClick={() => router.back()}
          className="flex flex-col items-center gap-1 text-text-light hover:text-foreground transition-colors w-1/4"
        >
          <i className="fa-solid fa-xmark w-5" aria-hidden />
          <span className="text-[10px] font-medium text-center leading-tight">Close</span>
        </button>
      </div>
    </div>
  );
}
