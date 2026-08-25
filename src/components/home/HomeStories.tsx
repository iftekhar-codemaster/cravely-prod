"use client";

import { useEffect, useState } from "react";
import type { Story, Restaurant } from "@/lib/data";
import { getSeenStories, markStorySeen } from "@/lib/track";
import SmartImg from "@/components/SmartImg";
import StoryViewer from "./StoryViewer";

export default function HomeStories({
  stories,
  restaurants,
}: {
  stories: Story[];
  restaurants: Restaurant[];
}) {
  const [seen, setSeen] = useState<Record<string, number>>({});
  const [openAt, setOpenAt] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setSeen(getSeenStories()), 0);
    const onChange = () => setSeen(getSeenStories());
    window.addEventListener("cravely:stories", onChange);
    return () => {
      clearTimeout(t);
      window.removeEventListener("cravely:stories", onChange);
    };
  }, []);

  // Drop legacy/malformed docs that predate the restaurant-linked model
  const clean = stories.filter(
    (s): s is Story & { restaurantId: string } =>
      typeof s.restaurantId === "string" && s.restaurantId.length > 0,
  );
  if (clean.length === 0) return null;

  const logoOf = (restaurantId: string) =>
    restaurants.find((r) => r.id === restaurantId)?.logo ??
    `https://loremflickr.com/100/100/food?lock=${(restaurantId.length || 1) % 97}`;

  const live = restaurants.find((r) => r.id === clean[openAt!]?.restaurantId);

  function handleSeen(id: string) {
    markStorySeen(id);
    setSeen(getSeenStories());
  }

  return (
    <>
      <div className="px-4 flex gap-4 overflow-x-auto no-scrollbar pb-1">
        {clean.map((story, i) => {
          const isSeen = Boolean(seen[story.id]);
          return (
            <button
              key={story.id}
              onClick={() => setOpenAt(i)}
              className="anim-pop flex flex-col items-center gap-2 min-w-[72px] pressable"
              style={{ animationDelay: `${Math.min(i * 55, 400)}ms` }}
              aria-label={`${story.name} story${isSeen ? " (seen)" : ""}`}
            >
              <span
                className={`w-[68px] h-[68px] rounded-full p-[3px] block ${
                  isSeen ? "bg-gray-300" : "bg-[linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)]"
                }`}
              >
                <SmartImg
                  src={logoOf(story.restaurantId)}
                  alt={story.name}
                  className="w-full h-full rounded-full ring-[3px] ring-background bg-gray-100"
                  imgClassName="w-full h-full object-cover"
                />
              </span>
              <span className={`text-xs font-medium w-[75px] text-center truncate ${isSeen ? "text-text-light" : ""}`}>
                {story.name}
              </span>
            </button>
          );
        })}
      </div>

      {openAt !== null && (
        <StoryViewer
          stories={clean}
          startIndex={openAt}
          logo={live?.logo ?? ""}
          onSeen={handleSeen}
          onClose={() => setOpenAt(null)}
        />
      )}
    </>
  );
}
