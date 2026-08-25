import { NextResponse } from "next/server";
import { collection, getDocs, limit, query } from "firebase/firestore";
import { getDb, isFirebaseConfigured } from "@/lib/firebase";

export const dynamic = "force-dynamic";

// Cheap deep health check for uptime monitors (Better Stack etc.):
// verifies the serverless function runs AND Firestore is readable.
// Cached briefly so 1-minute monitors don't hammer Firestore.
const CACHE_MS = 30_000;
let last: { at: number; status: number; body: object } | null = null;

export async function GET() {
  if (last && Date.now() - last.at < CACHE_MS) {
    return NextResponse.json(last.body, { status: last.status });
  }

  if (!isFirebaseConfigured) {
    last = {
      at: Date.now(),
      status: 503,
      body: { status: "down", error: "firebase_not_configured" },
    };
    return NextResponse.json(last.body, { status: last.status });
  }

  const started = Date.now();
  try {
    const db = getDb();
    if (!db) throw new Error("no db");
    await getDocs(query(collection(db, "restaurants"), limit(1)));
    last = {
      at: Date.now(),
      status: 200,
      body: {
        status: "ok",
        firestore: "ok",
        latencyMs: Date.now() - started,
        checkedAt: new Date().toISOString(),
      },
    };
  } catch (err) {
    last = {
      at: Date.now(),
      status: 503,
      body: {
        status: "down",
        firestore: "error",
        error: err instanceof Error ? err.name : "unknown",
        checkedAt: new Date().toISOString(),
      },
    };
  }

  return NextResponse.json(last.body, { status: last.status });
}
