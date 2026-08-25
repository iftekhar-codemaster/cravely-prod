"use client";

import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { APP_URL } from "@/lib/site";

/**
 * The apex domain is the public landing page — signed-in users go straight
 * to the app. Firebase sessions are client-side only, so this check runs
 * after hydration (middleware cannot see them).
 */
export default function AuthedRedirect() {
  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) window.location.replace(`${APP_URL}/`);
    });
    return unsub;
  }, []);
  return null;
}
