"use client";

// Per-user sync of behavioral state (likes, views, geo consent) to the
// user's Firestore profile, so it survives devices. localStorage stays the
// source of truth for reads (instant + works for guests); writes here
// mirror changes to users/{uid} fire-and-forget.

import { doc, getDoc, setDoc } from "firebase/firestore";
import { getFirebaseAuth, getDb } from "./firebase";

type UserStateFields = {
  liked?: string[];
  views?: Record<string, number>;
  geoOptIn?: boolean;
};

let syncTimer: ReturnType<typeof setTimeout> | undefined;

function currentUser() {
  return getFirebaseAuth()?.currentUser ?? null;
}

function writeFields(fields: Partial<UserStateFields>) {
  const user = currentUser();
  const db = getDb();
  if (!user || !db) return;
  void setDoc(doc(db, "users", user.uid), fields, { merge: true }).catch(
    (err) => console.warn("[cravely] user state sync failed:", err),
  );
}

export function syncUserField(
  key: "liked" | "geoOptIn",
  value: string[] | boolean,
): void {
  writeFields({ [key]: value } as Partial<UserStateFields>);
}

/** Views change often — debounce writes. */
export function syncUserViews(views: Record<string, number>): void {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => writeFields({ views }), 2000);
}

/**
 * On sign-in: merge server state into local (union likes, max views,
 * geo OR), then persist the merged set so all devices converge.
 */
export async function mergeUserState(uid: string): Promise<void> {
  const db = getDb();
  if (!db || typeof window === "undefined") return;
  try {
    const snap = await getDoc(doc(db, "users", uid));
    const remote = (snap.data() ?? {}) as UserStateFields;

    const localLiked = JSON.parse(
      localStorage.getItem("cravely:liked") ?? "[]",
    ) as string[];
    const localViews = JSON.parse(
      localStorage.getItem("cravely:views") ?? "{}",
    ) as Record<string, number>;
    const localGeo = localStorage.getItem("cravely:geo") === "1";

    const liked = Array.from(new Set([...(remote.liked ?? []), ...localLiked]));
    const views: Record<string, number> = { ...(remote.views ?? {}) };
    for (const [k, v] of Object.entries(localViews)) {
      views[k] = Math.max(views[k] ?? 0, v);
    }
    const geo = Boolean(remote.geoOptIn) || localGeo;

    localStorage.setItem("cravely:liked", JSON.stringify(liked));
    localStorage.setItem("cravely:views", JSON.stringify(views));
    localStorage.setItem("cravely:geo", geo ? "1" : "0");
    window.dispatchEvent(new Event("cravely:store"));

    writeFields({ liked, views, geoOptIn: geo });
  } catch (err) {
    console.warn("[cravely] user state merge failed:", err);
  }
}
