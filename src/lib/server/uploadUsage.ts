import { getDb } from "@/lib/firebase";

// R2 free-tier guard: Class A (write) ops are limited to 1M/month.
// Counters live in Firestore (uploadUsage collection) and are read/written via
// the Firestore REST API using the CALLER'S ID token, so security rules apply
// and no privileged credentials are needed on the server.

export const DAILY_LIMIT_PER_USER = Number(process.env.R2_DAILY_LIMIT_PER_USER ?? 40);
export const DAILY_LIMIT_GLOBAL = Number(process.env.R2_DAILY_LIMIT_GLOBAL ?? 300);

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const BASE = () =>
  `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

type Usage = { count: number; day: string };

async function fsGet(
  path: string,
  idToken: string,
): Promise<Record<string, unknown> | null> {
  const res = await fetch(`${BASE()}/${path}`, {
    headers: { authorization: `Bearer ${idToken}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return (await res.json()) as Record<string, unknown>;
}

async function fsSet(
  path: string,
  idToken: string,
  fields: Record<string, unknown>,
): Promise<boolean> {
  const res = await fetch(`${BASE()}/${path}`, {
    method: "PATCH",
    headers: {
      authorization: `Bearer ${idToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ fields }),
  });
  return res.ok;
}

// Firestore value encoders
const enc = {
  stringValue: (v: string) => ({ stringValue: v }),
  integerValue: (v: number) => ({ integerValue: String(v) }),
};

function decodeUsage(doc: Record<string, unknown> | null): Usage {
  const f = doc?.fields as
    | { count?: { integerValue?: string }; day?: { stringValue?: string } }
    | undefined;
  const day = f?.day?.stringValue ?? "";
  if (day !== todayKey()) return { count: 0, day: todayKey() };
  return { count: Number(f?.count?.integerValue ?? 0), day };
}

export async function checkAndIncrementUser(
  uid: string,
  idToken: string,
): Promise<{ ok: boolean; used: number; limit: number }> {
  const docData = await fsGet(`uploadUsage/${uid}`, idToken);
  const usage = decodeUsage(docData);
  if (usage.count >= DAILY_LIMIT_PER_USER) {
    return { ok: false, used: usage.count, limit: DAILY_LIMIT_PER_USER };
  }
  const next = { count: usage.count + 1, day: usage.day };
  const wrote = await fsSet(`uploadUsage/${uid}`, idToken, {
    count: enc.integerValue(next.count),
    day: enc.stringValue(next.day),
  });
  if (!wrote) throw new Error("usage write failed");
  return { ok: true, used: next.count, limit: DAILY_LIMIT_PER_USER };
}

export async function checkGlobalLimit(idToken: string): Promise<boolean> {
  const docData = await fsGet("uploadUsage/_global", idToken);
  const usage = decodeUsage(docData);
  return usage.count < DAILY_LIMIT_GLOBAL;
}

export async function incrementGlobal(idToken: string): Promise<void> {
  const docData = await fsGet("uploadUsage/_global", idToken);
  const usage = decodeUsage(docData);
  await fsSet("uploadUsage/_global", idToken, {
    count: enc.integerValue(usage.count + 1),
    day: enc.stringValue(usage.day),
  });
}

/** Admin overview: per-user upload usage for today (Class A ops). */
export async function listUsage(): Promise<
  { uid: string; count: number; day: string }[]
> {
  const db = getDb();
  if (!db) return [];
  const { getDocs, collection, query } = await import("firebase/firestore");
  const snap = await getDocs(query(collection(db, "uploadUsage")));
  return snap.docs.map((d) => {
    const u = d.data() as Usage;
    return { uid: d.id, count: u.count ?? 0, day: u.day ?? "" };
  });
}
