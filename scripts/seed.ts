// Seeds Firestore with the Cravely starter dataset (src/lib/mock-data.ts).
//
// Usage:
//   1. Copy .env.example to .env.local and fill in your Firebase web config.
//   2. npm run seed
//
// Safe to re-run — it overwrites by fixed document ids.

import { initializeApp as initClientApp } from "firebase/app";
import {
  getFirestore as getClientFirestore,
  collection as clientCollection,
  doc as clientDoc,
  writeBatch as clientWriteBatch,
} from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
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

import type { Firestore as ClientFirestore } from "firebase/firestore";
import type { Firestore as AdminFirestore } from "firebase-admin/firestore";

const serviceAccountB64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
const adminEmail =
  process.env.ADMIN_EMAIL ?? process.env.NEXT_PUBLIC_OWNER_EMAIL ?? "itx.iftekhars@gmail.com";
const adminPassword = process.env.ADMIN_PASSWORD;

let adminDb: AdminFirestore | null = null;
let clientDb: ClientFirestore | null = null;

if (serviceAccountB64) {
  try {
    const { initializeApp: initAdminApp, cert, getApps } = await import("firebase-admin/app");
    const { getFirestore: getAdminFirestore } = await import("firebase-admin/firestore");
    const raw = JSON.parse(Buffer.from(serviceAccountB64, "base64").toString("utf8"));
    const adminApp =
      getApps().find((a) => a.name === "cravely-seed") ??
      initAdminApp(
        { credential: cert({ projectId: raw.project_id, ...raw }) },
        "cravely-seed",
      );
    adminDb = getAdminFirestore(adminApp);
    console.log("Seeding using Firebase Admin service account.");
  } catch (err) {
    console.warn("Failed to initialize Firebase Admin SDK from FIREBASE_SERVICE_ACCOUNT_B64:", err);
  }
}

if (!adminDb) {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.appId) {
    console.error(
      "Missing Firebase env vars. Ensure NEXT_PUBLIC_FIREBASE_* are in .env or .env.local.",
    );
    process.exit(1);
  }

  const app = initClientApp(firebaseConfig);
  const auth = getAuth(app);
  clientDb = getClientFirestore(app);

  if (!adminPassword) {
    console.error(
      `\n❌ Database seeding requires admin authentication under firestore.rules.\n` +
      `Please provide ADMIN_PASSWORD (for ${adminEmail}) or FIREBASE_SERVICE_ACCOUNT_B64 in .env or .env.local.\n` +
      `Example:\n  ADMIN_PASSWORD=your_password npm run seed\n`
    );
    process.exit(1);
  }

  try {
    console.log(`Authenticating as admin (${adminEmail})…`);
    await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
    console.log("Authenticated successfully.");
  } catch (err) {
    const error = err as { code?: string; message?: string };
    console.error(`Authentication failed for ${adminEmail}:`, error?.code ?? error?.message);
    process.exit(1);
  }
}

async function seedCollection(name: string, rows: Record<string, unknown>[]) {
  if (adminDb) {
    let batch = adminDb.batch();
    let ops = 0;
    for (const row of rows) {
      const { id, ...data } = row;
      batch.set(adminDb.collection(name).doc(id as string), data);
      if (++ops >= 450) {
        await batch.commit();
        batch = adminDb.batch();
        ops = 0;
      }
    }
    if (ops > 0) await batch.commit();
  } else if (clientDb) {
    let batch = clientWriteBatch(clientDb);
    let ops = 0;
    for (const row of rows) {
      const { id, ...data } = row;
      batch.set(clientDoc(clientCollection(clientDb, name), id as string), data);
      if (++ops >= 450) {
        await batch.commit();
        batch = clientWriteBatch(clientDb);
        ops = 0;
      }
    }
    if (ops > 0) await batch.commit();
  }
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
