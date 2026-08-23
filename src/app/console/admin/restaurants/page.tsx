"use client";

import { useCallback, useEffect, useState } from "react";
import { collection, doc, getDocs, updateDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { audit } from "@/lib/audit";
import type { Restaurant } from "@/lib/data";

export default function AdminRestaurantsPage() {
  const [rows, setRows] = useState<(Restaurant & { verified: boolean })[] | null>(
    null,
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const db = getDb();
    if (!db) return;
    const snap = await getDocs(collection(db, "restaurants"));
    setRows(
      snap.docs.map(
        (d) =>
          ({
            id: d.id,
            ...(d.data() as Omit<Restaurant, "id">),
          }) as Restaurant,
      ),
    );
  }, []);

  useEffect(() => {
    const t = setTimeout(
      () => void load().catch(() => setError("Could not load restaurants.")),
      0,
    );
    return () => clearTimeout(t);
  }, [load]);

  async function toggleVerified(r: Restaurant) {
    setBusyId(r.id);
    setError(null);
    try {
      await updateDoc(doc(getDb()!, "restaurants", r.id), {
        verified: !r.verified,
      });
      void audit("restaurant.verified", r.id, { verified: !r.verified, name: r.name });
      await load();
    } catch {
      setError("Could not update — admin access required.");
    } finally {
      setBusyId(null);
    }
  }

  if (!rows) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-extrabold mb-1">Restaurants</h1>
      <p className="text-sm text-text-light mb-5">
        Toggle the verified badge shown on restaurant pages and cards.
      </p>
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-primary">{error}</p>
      )}
      <div className="space-y-3">
        {rows.map((r) => (
          <div
            key={r.id}
            className="flex items-center gap-3 rounded-xl border border-line bg-card p-3 shadow-card"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={r.logo}
              alt=""
              className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{r.name}</div>
              <p className="text-xs text-text-light truncate">
                {r.cuisine} · ⭐ {r.rating} ({r.reviews})
              </p>
            </div>
            <button
              onClick={() => void toggleVerified(r)}
              disabled={busyId === r.id}
              className={`flex-shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-full transition-colors ${
                r.verified
                  ? "bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-600"
                  : "bg-gray-100 text-text-light hover:bg-primary hover:text-white"
              }`}
            >
              {busyId === r.id ? "…" : r.verified ? "VERIFIED ✓" : "UNVERIFIED"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
