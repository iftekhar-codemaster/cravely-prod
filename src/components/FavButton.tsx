"use client";

import { useEffect, useState } from "react";
import { getLiked, toggleLiked } from "@/lib/store";

export default function FavButton({ foodId }: { foodId: string }) {
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    // deferred so we don't call setState synchronously inside the effect
    const t = setTimeout(() => setLiked(getLiked().includes(foodId)), 0);
    return () => clearTimeout(t);
  }, [foodId]);

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setLiked(toggleLiked(foodId));
      }}
      aria-label={liked ? "Remove from liked" : "Add to liked"}
      aria-pressed={liked}
      className={`absolute top-2 right-2 w-7 h-7 rounded-full bg-white shadow-[0_4px_10px_rgba(0,0,0,0.15)]
        flex items-center justify-center text-xs transition-colors ${
          liked ? "text-primary" : "text-text-light"
        }`}
    >
      <i className="fa-solid fa-heart" aria-hidden />
    </button>
  );
}
