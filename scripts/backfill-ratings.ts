// One-time backfill: recomputes rating/reviews aggregates on every food doc
// from the actual reviews collection. Safe to re-run.
//
//   node --env-file-if-exists=.env.local scripts/backfill-ratings.ts

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  where,
  updateDoc,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.appId) {
  console.error("Missing Firebase env vars (.env.local).");
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const foodsSnap = await getDocs(collection(db, "foods"));
console.log(`Foods: ${foodsSnap.size}`);

let updated = 0;
for (const food of foodsSnap.docs) {
  const revSnap = await getDocs(
    query(collection(db, "reviews"), where("foodId", "==", food.id)),
  );
  const count = revSnap.size;
  const avg =
    count > 0
      ? revSnap.docs.reduce(
          (s, d) => s + ((d.data() as { rating?: number }).rating ?? 0),
          0,
        ) / count
      : 0;
  const rating = Number(avg.toFixed(1));

  const cur = food.data() as { rating?: number; reviews?: number };
  if (cur.rating !== rating || cur.reviews !== count) {
    await updateDoc(food.ref, { rating, reviews: count });
    console.log(
      `  ${food.id}: ${cur.rating ?? 0}/${cur.reviews ?? 0} -> ${rating}/${count}`,
    );
    updated++;
  }
}

console.log(`Done. ${updated} food doc(s) updated.`);
