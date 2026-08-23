"use client";

import { useCallback, useEffect, useState } from "react";
import { getDocs, collection } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { listUsage } from "@/lib/server/uploadUsage";

type Row = { uid: string; email: string; count: number; stale: boolean };

export default function AdminStoragePage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const db = getDb()!;
    const [usage, users] = await Promise.all([
      listUsage(),
      getDocs(collection(db, "users")),
    ]);
    const emails = new Map(users.docs.map((d) => [d.id, (d.data() as { email?: string }).email ?? d.id]));
    const today = new Date().toISOString().slice(0, 10);
    const rows = usage
      .map((u) => ({
        uid: u.uid,
        email: emails.get(u.uid) ?? u.uid,
        count: u.day === today ? u.count : 0,
        stale: u.day !== today,
      }))
      .sort((a, b) => b.count - a.count);
    setRows(rows);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void load().catch(() => setError("Could not load usage.")), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const todayTotal = rows?.reduce((s, r) => s + r.count, 0) ?? 0;
  const GLOBAL = Number(process.env.R2_DAILY_LIMIT_GLOBAL ?? 300);
  const pct = Math.min(100, Math.round((todayTotal / GLOBAL) * 100));

  return (
    <div className="pb-24">
      <h1 className="text-xl font-extrabold mb-1">Storage · R2 usage</h1>
      <p className="text-sm text-text-light mb-5">
        Uploads are <b>Class A</b> write ops (free: 1M/month). Reads of images are{" "}
        <b>Class B</b> (free: 10M/month) — served from Cloudflare&apos;s edge with
        zero egress fees.
      </p>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-primary">{error}</p>
      )}

      {/* Global today */}
      <div className="rounded-2xl bg-gray-900 text-white p-5 shadow-lg mb-6">
        <p className="text-[11px] uppercase tracking-widest text-white/60">
          Uploads today (Class A)
        </p>
        <div className="flex items-end gap-2 mt-1">
          <span className="text-3xl font-extrabold">{todayTotal}</span>
          <span className="text-sm text-white/60 mb-1">/ {GLOBAL} daily cap</span>
        </div>
        <div className="h-2 rounded-full bg-white/15 mt-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-[width] duration-500 ${
              pct > 80 ? "bg-red-400" : pct > 50 ? "bg-amber-300" : "bg-green-400"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Limits explainer */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="rounded-xl border border-line bg-card p-4">
          <div className="font-bold text-sm">Class A · writes</div>
          <div className="text-2xl font-extrabold text-primary">1M</div>
          <div className="text-[11px] text-text-light">free ops / month</div>
        </div>
        <div className="rounded-xl border border-line bg-card p-4">
          <div className="font-bold text-sm">Class B · reads</div>
          <div className="text-2xl font-extrabold text-primary">10M</div>
          <div className="text-[11px] text-text-light">free ops / month</div>
        </div>
      </div>

      {/* Per-user */}
      <h2 className="font-bold text-sm mb-3">Uploads per user (today)</h2>
      {!rows ? (
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-12 rounded-xl skel" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-text-light text-center py-8">
          No uploads yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li
              key={r.uid}
              className="flex items-center gap-3 rounded-xl border border-line bg-card px-3 py-2.5"
            >
              <i className="fa-solid fa-cloud-arrow-up text-primary" aria-hidden />
              <span className="flex-1 min-w-0 text-sm truncate">{r.email}</span>
              <span
                className={`font-extrabold text-sm ${
                  r.count >= 40 ? "text-red-500" : ""
                }`}
              >
                {r.count}
                <span className="text-[10px] text-text-light font-normal">/40 day</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
