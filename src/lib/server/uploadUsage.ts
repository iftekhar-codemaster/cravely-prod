import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  query,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";

// R2 free-tier guard: Class A (write) ops are limited to 1M/month — cheap to
// protect. Each user gets a rolling daily upload allowance; a global daily cap
// protects against a compromised account burning the whole quota.
export const DAILY_LIMIT_PER_USER = Number(process.env.R2_DAILY_LIMIT_PER_USER ?? 40);
export const DAILY_LIMIT_GLOBAL = Number(process.env.R2_DAILY_LIMIT_GLOBAL ?? 300);

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

type Usage = { count: number; day: string };

async function readUsage(uid: string): Promise<Usage> {
  const db = getDb();
  if (!db) return { count: 0, day: todayKey() };
  const snap = await getDoc(doc(db, "uploadUsage", uid));
  const data = snap.data() as Usage | undefined;
  if (!data || data.day !== todayKey()) return { count: 0, day: todayKey() };
  return data;
}

async function writeUsage(uid: string, usage: Usage): Promise<void> {
  const db = getDb();
  if (!db) return;
  await setDoc(doc(db, "uploadUsage", uid), usage, { merge: true });
}

export async function checkAndIncrementUser(
  uid: string,
): Promise<{ ok: boolean; used: number; limit: number }> {
  const usage = await readUsage(uid);
  if (usage.count >= DAILY_LIMIT_PER_USER) {
    return { ok: false, used: usage.count, limit: DAILY_LIMIT_PER_USER };
  }
  const next = { count: usage.count + 1, day: usage.day };
  await writeUsage(uid, next);
  return { ok: true, used: next.count, limit: DAILY_LIMIT_PER_USER };
}

export async function checkGlobalLimit(): Promise<boolean> {
  const db = getDb();
  if (!db) return true;
  const snap = await getDocs(collection(db, "uploadUsage"));
  const today = todayKey();
  const total = snap.docs.reduce(
    (sum, d) => {
      const u = d.data() as Usage;
      return u.day === today ? sum + u.count : sum;
    },
    0,
  );
  return total < DAILY_LIMIT_GLOBAL;
}

/** Admin overview: per-user upload usage for today (Class A ops). */
export async function listUsage(): Promise<
  { uid: string; count: number; day: string }[]
> {
  const db = getDb();
  if (!db) return [];
  const snap = await getDocs(query(collection(db, "uploadUsage")));
  return snap.docs.map((d) => {
    const u = d.data() as Usage;
    return { uid: d.id, count: u.count ?? 0, day: u.day ?? "" };
  });
}
