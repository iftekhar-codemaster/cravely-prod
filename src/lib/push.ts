"use client";

// Web push via Firebase Cloud Messaging. Tokens are stored in the
// `fcmTokens` collection so the /api/push sender can reach each device.

import {
  getMessaging,
  getToken,
  isSupported,
  type Messaging,
} from "firebase/messaging";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { getDb, getFirebaseAuth } from "./firebase";

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

export function pushSupported(): Promise<boolean> {
  return isSupported();
}

async function getMessagingSafe(): Promise<Messaging | null> {
  if (!(await isSupported())) return null;
  try {
    return getMessaging();
  } catch {
    return null;
  }
}

/** Registers the SW, gets/refreshes the FCM token, stores it for this user. */
export async function enablePush(): Promise<boolean> {
  const auth = getFirebaseAuth();
  const db = getDb();
  const user = auth?.currentUser;
  if (!user || !db || !VAPID_KEY) return false;
  if (typeof Notification !== "undefined" && Notification.permission !== "granted") {
    return false;
  }
  const messaging = await getMessagingSafe();
  if (!messaging) return false;

  const reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  // Wait for the SW to be active before requesting a token.
  await navigator.serviceWorker.ready;

  const token = await getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: reg,
  });
  if (!token) return false;

  // Skip if this exact token is already stored for this user.
  const existing = await getDocs(
    query(collection(db, "fcmTokens"), where("token", "==", token)),
  );
  if (existing.docs.some((d) => (d.data() as { uid?: string }).uid === user.uid)) {
    return true;
  }
  await addDoc(collection(db, "fcmTokens"), {
    uid: user.uid,
    token,
    createdAt: new Date(),
  });
  return true;
}
