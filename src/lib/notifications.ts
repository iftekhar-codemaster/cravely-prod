"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { getDb, getFirebaseAuth } from "./firebase";
import { haversineKm } from "./geo";
import { useAuth } from "@/components/AuthProvider";

export type NotificationAudience =
  | { type: "all" }
  | { type: "range"; lat: number; lng: number; radiusKm: number };

export type NotificationDoc = {
  id: string;
  title: string;
  body: string;
  createdAt?: unknown;
  createdBy?: string;
  offerId?: string;
  restaurantId?: string;
  audience: NotificationAudience;
};

export type SendNotificationInput = {
  title: string;
  body: string;
  audience: NotificationAudience;
  offerId?: string;
  restaurantId?: string;
};

type LocationAwareProfile = {
  locationLat?: number | null;
  locationLng?: number | null;
  notificationsReadAt?: unknown;
};

function toMillis(v: unknown): number {
  if (!v || typeof v !== "object") return 0;
  const t = v as { toDate?: () => Date; seconds?: number };
  if (typeof t.toDate === "function") return t.toDate().getTime();
  if (typeof t.seconds === "number") return t.seconds * 1000;
  return 0;
}

export async function sendNotification(
  input: SendNotificationInput,
): Promise<string> {
  const db = getDb();
  if (!db) throw new Error("Firebase is not configured.");
  const ref = await addDoc(collection(db, "notifications"), {
    title: input.title,
    body: input.body,
    audience: input.audience,
    ...(input.offerId ? { offerId: input.offerId } : {}),
    ...(input.restaurantId ? { restaurantId: input.restaurantId } : {}),
    createdBy: getFirebaseAuth()?.currentUser?.uid ?? "",
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function fetchNotifications(): Promise<NotificationDoc[]> {
  const db = getDb();
  if (!db) return [];
  const snap = await getDocs(collection(db, "notifications"));
  const rows = snap.docs.map(
    (d) =>
      ({ id: d.id, ...(d.data() as Omit<NotificationDoc, "id">) }) as NotificationDoc,
  );
  rows.sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));
  return rows.slice(0, 50);
}

export function notificationCreatedAtMs(n: NotificationDoc): number {
  return toMillis(n.createdAt);
}

export function filterNotificationsForUser(
  rows: NotificationDoc[],
  profile: LocationAwareProfile | null,
): NotificationDoc[] {
  return rows.filter((n) => {
    if (n.audience?.type !== "range") return true;
    if (
      typeof profile?.locationLat !== "number" ||
      typeof profile?.locationLng !== "number"
    ) {
      return false;
    }
    return (
      haversineKm(
        profile.locationLat,
        profile.locationLng,
        n.audience.lat,
        n.audience.lng,
      ) <= n.audience.radiusKm
    );
  });
}

export function useNotifications() {
  const { user, profile } = useAuth();
  const [rows, setRows] = useState<NotificationDoc[] | null>(null);

  useEffect(() => {
    const t = setTimeout(
      () =>
        void (user
          ? fetchNotifications()
              .then((r) => setRows(r))
              .catch((e) => {
                console.warn("[cravely] notifications load failed:", e);
                setRows([]);
              })
          : Promise.resolve(setRows([]))),
      0,
    );
    return () => clearTimeout(t);
  }, [user]);

  const notifProfile = profile as unknown as LocationAwareProfile | null;
  const notifications = useMemo(
    () => (rows ? filterNotificationsForUser(rows, notifProfile) : []),
    [rows, notifProfile],
  );

  const readAtMs = toMillis(notifProfile?.notificationsReadAt);
  const unreadCount = user
    ? notifications.filter((n) => toMillis(n.createdAt) > readAtMs).length
    : 0;

  const markAllRead = useCallback(async () => {
    if (!user) return;
    const db = getDb();
    if (!db) return;
    await setDoc(
      doc(db, "users", user.uid),
      { notificationsReadAt: serverTimestamp() },
      { merge: true },
    );
  }, [user]);

  return {
    notifications,
    unreadCount,
    markAllRead,
    loading: rows === null,
  };
}

export function useUnreadNotificationsCount(): number {
  return useNotifications().unreadCount;
}
