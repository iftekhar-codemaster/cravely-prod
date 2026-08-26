// One-time backfill: recomputes each restaurant's rating/reviews from its
// dishes' live aggregates. Safe to re-run.
//
//   node --env-file-if-exists=.env scripts/backfill-restaurant-ratings.ts

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  updateDoc,
} from "firebase/firestore";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";

const cfg = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};
if (!cfg.apiKey || !cfg.projectId) {
  console.error("Missing Firebase env vars.");
  process.exit(1);
}
const app = initializeApp(cfg);
const db = getFirestore(app);
const auth = getAuth(app);

// Rules require a signed-in writer for aggregate updates. Use a throwaway
// service account (idempotent — signs in if it already exists).
const SERVICE_EMAIL = "backfill-service@cravely.space";
const SERVICE_PASS = "cravely-backfill-" + cfg.projectId;
try {
  await createUserWithEmailAndPassword(auth, SERVICE_EMAIL, SERVICE_PASS);
} catch {
  await signInWithEmailAndPassword(auth, SERVICE_EMAIL, SERVICE_PASS);
}
console.log("Authenticated as backfill service account.");

const restaurants = await getDocs(collection(db, "restaurants"));
console.log(`Restaurants: ${restaurants.size}`);

let updated = 0;
for (const r of restaurants.docs) {
  const foodsSnap = await getDocs(
    query(collection(db, "foods"), where("restaurantId", "==", r.id)),
  );
  const rated = foodsSnap.docs
    .map((d) => d.data() as { rating?: number; reviews?: number })
    .filter((f) => (f.reviews ?? 0) > 0 && (f.rating ?? 0) > 0);
  const avg =
    rated.length > 0
      ? rated.reduce((s, f) => s + (f.rating ?? 0), 0) / rated.length
      : 0;
  const reviews = rated.reduce((s, f) => s + (f.reviews ?? 0), 0);
  const rating = Number(avg.toFixed(1));

  const cur = r.data() as { rating?: number; reviews?: number };
  if (cur.rating !== rating || cur.reviews !== reviews) {
    await updateDoc(r.ref, { rating, reviews });
    console.log(`  ${r.id}: ${cur.rating ?? 0}/${cur.reviews ?? 0} -> ${rating}/${reviews}`);
    updated++;
  }
}

console.log(`Done. ${updated} restaurant doc(s) updated.`);
