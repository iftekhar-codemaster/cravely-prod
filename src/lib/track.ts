"use client";

// Behavioral signals stored locally: loved dishes (existing store.ts),
// product views and geo opt-in. Feeds the recommendation engine.

const VIEWS_KEY = "cravely:views";
const GEO_KEY = "cravely:geo";
const SEEN_KEY = "cravely:storiesSeen";

type ViewMap = Record<string, number>; // foodId -> view count

function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const v = JSON.parse(window.localStorage.getItem(key) ?? "null");
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

export function getViews(): ViewMap {
  return readJSON<ViewMap>(VIEWS_KEY, {});
}

export function trackView(foodId: string): void {
  if (typeof window === "undefined") return;
  const views = getViews();
  views[foodId] = Math.min((views[foodId] ?? 0) + 1, 10);
  window.localStorage.setItem(VIEWS_KEY, JSON.stringify(views));
}

export function isGeoOptedIn(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(GEO_KEY) === "1";
}

export function setGeoOptedIn(v: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GEO_KEY, v ? "1" : "0");
}

/** One-shot aggregated signal snapshot for scoring. */
export type Signals = {
  loved: string[];
  views: ViewMap;
  geo: boolean;
};

export function collectSignals(lovedIds: string[]): Signals {
  return { loved: lovedIds, views: getViews(), geo: isGeoOptedIn() };
}

// ---- Stories: seen/unseen (Instagram-style rings) ----

export function getSeenStories(): Record<string, number> {
  return readJSON<Record<string, number>>(SEEN_KEY, {});
}

export function isStorySeen(storyId: string): boolean {
  return Boolean(getSeenStories()[storyId]);
}

export function markStorySeen(storyId: string): void {
  if (typeof window === "undefined") return;
  const seen = getSeenStories();
  seen[storyId] = Date.now();
  // keep the map from growing forever
  const keys = Object.keys(seen);
  if (keys.length > 200) {
    keys
      .sort((a, b) => seen[a] - seen[b])
      .slice(0, keys.length - 200)
      .forEach((k) => delete seen[k]);
  }
  window.localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
  window.dispatchEvent(new Event("cravely:stories"));
}
