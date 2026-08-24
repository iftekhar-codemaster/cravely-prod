"use client";

import { useCallback, useEffect, useState } from "react";
import { getStories, getAllRestaurants, type Story, type Restaurant } from "@/lib/data";
import { getSeenStories, markStorySeen } from "@/lib/track";
import SmartImg from "@/components/SmartImg";
import StoryViewer from "./StoryViewer";

export default function HomeStories() {
  const [stories, setStories] = useState<Story[] | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [seen, setSeen] = useState<Record<string, number>>({});
  const [openAt, setOpenAt] = useState<number | null>(null);

  const load = useCallback(async () => {
    const [s, r] = await Promise.all([getStories(), getAllRestaurants()]);
    setStories(s);
    setRestaurants(r);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      void load();
      setSeen(getSeenStories());
    }, 0);
    window.addEventListener("cravely:stories", () => setSeen(getSeenStories()));
    return () => {
      clearTimeout(t);
      window.removeEventListener("cravely:stories", () => setSeen(getSeenStories()));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (stories === null) {
    return (
      <div className="px-4 flex gap-4 overflow-hidden">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col items-center gap-2 min-w-[72px]">
            <div className="w-[68px] h-[68px] rounded-full skel" />
            <div className="h-3 w-14 rounded skel" />
          </div>
        ))}
      </div>
    );
  }

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
