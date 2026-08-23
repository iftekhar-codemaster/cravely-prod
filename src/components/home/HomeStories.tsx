"use client";

import { useEffect, useState } from "react";
import { getStories, getAllRestaurants, type Story, type Restaurant } from "@/lib/data";
import SmartImg from "@/components/SmartImg";
import StoryViewer from "./StoryViewer";

const VIEW_MS = 5000;

export default function HomeStories() {
  const [stories, setStories] = useState<Story[] | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [openAt, setOpenAt] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      void Promise.all([getStories(), getAllRestaurants()]).then(([s, r]) => {
        setStories(s);
        setRestaurants(r);
      });
    }, 0);
    return () => clearTimeout(t);
  }, []);

  if (!stories) {
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

  if (stories.length === 0) return null;

  const logoOf = (restaurantId: string) =>
    restaurants.find((r) => r.id === restaurantId)?.logo ??
    `https://loremflickr.com/100/100/food?lock=${restaurantId.length}`;

  const live = restaurants.find(
    (r) => r.id === stories[openAt!]?.restaurantId,
  );

  return (
    <>
      <div className="px-4 flex gap-4 overflow-x-auto no-scrollbar pb-1">
        {stories.map((story, i) => (
          <button
            key={story.id}
            onClick={() => setOpenAt(i)}
            className={`anim-pop flex flex-col items-center gap-2 min-w-[72px] pressable`}
            style={{ animationDelay: `${Math.min(i * 55, 400)}ms` }}
            aria-label={`${story.name} story`}
          >
            <span className="w-[68px] h-[68px] rounded-full p-[3px] bg-[linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)] block">
              <SmartImg
                src={logoOf(story.restaurantId)}
                alt={story.name}
                className="w-full h-full rounded-full ring-[3px] ring-background bg-gray-100"
                imgClassName="w-full h-full object-cover"
              />
            </span>
            <span className="text-xs font-medium w-[75px] text-center truncate text-left">
              {story.name}
            </span>
          </button>
        ))}
      </div>

      {openAt !== null && (
        <StoryViewer
          stories={stories}
          startIndex={openAt}
          logo={live?.logo ?? ""}
          onClose={() => setOpenAt(null)}
        />
      )}
    </>
  );
}

export { VIEW_MS };
