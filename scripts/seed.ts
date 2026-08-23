// Seeds Firestore with the Cravely starter dataset (src/lib/mock-data.ts).
//
// Usage:
//   1. Copy .env.example to .env.local and fill in your Firebase web config.
//   2. npm run seed
//
// Safe to re-run — it overwrites by fixed document ids.

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  writeBatch,
} from "firebase/firestore";
import {
  restaurants,
  foods,
  stories,
  offers,
  cuisines,
} from "../src/lib/mock-data.ts";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.appId) {
  console.error(
    "Missing Firebase env vars. Copy .env.example to .env.local and fill them in.",
  );
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seedCollection(name, rows) {
  let batch = writeBatch(db);
  let ops = 0;
  for (const row of rows) {
    const { id, ...data } = row;
    batch.set(doc(collection(db, name), id), data);
    if (++ops >= 450) {
      await batch.commit();
      batch = writeBatch(db);
      ops = 0;
    }
  }
  if (ops > 0) await batch.commit();
  console.log(`Seeded ${rows.length} document(s) → ${name}`);
}

await seedCollection("restaurants", restaurants);
await seedCollection("foods", foods);
await seedCollection(
  "stories",
  stories.map((s, i) => ({ id: `story-${i}`, ...s })),
);
await seedCollection(
  "offers",
  offers.map((o, i) => ({ id: `offer-${i}`, ...o })),
);
await seedCollection("cuisines", [{ id: "default", items: cuisines }]);

console.log("Done ✅");
process.exit(0);
