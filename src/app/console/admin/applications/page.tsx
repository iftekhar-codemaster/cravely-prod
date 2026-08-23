"use client";

import { useCallback, useEffect, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { audit } from "@/lib/audit";

type Application = {
  id: string;
  uid: string;
  email: string;
  name: string;
  cuisine: string;
  address: string;
  status: "pending" | "approved" | "rejected";
};

const STATUS_STYLES = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-600",
} as const;

function randomLock(): number {
  return Math.floor(Math.random() * 900);
}

export default function AdminApplicationsPage() {
  const [apps, setApps] = useState<Application[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const db = getDb();
    if (!db) return;
    const snap = await getDocs(
      query(collection(db, "applications"), orderBy("createdAt", "desc")),
    ).catch(() => getDocs(collection(db, "applications")));
    const rows = snap.docs.map(
      (d) => ({ ...(d.data() as Omit<Application, "id">), id: d.id }),
    );
    rows.sort((a, b) =>
      a.status === b.status
        ? 0
        : a.status === "pending"
          ? -1
          : b.status === "pending"
            ? 1
            : 0,
    );
    setApps(rows);
  }, []);

  useEffect(() => {
    const t = setTimeout(
      () => void load().catch(() => setError("Could not load applications.")),
      0,
    );
    return () => clearTimeout(t);
     
  }, [load]);

  async function decide(app: Application, decision: "approved" | "rejected") {
    setBusyId(app.id);
    setError(null);
    try {
      const db = getDb()!;
      await updateDoc(doc(db, "applications", app.id), { status: decision });
      await audit(
        "application.decision",
        app.id,
        { decision, name: app.name, applicant: app.email },
      );
      if (decision === "approved") {
        // Create the verified public restaurant listing
        const slug =
          app.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "") || `restaurant-${app.id.slice(0, 6)}`;
        await setDoc(doc(db, "restaurants", slug), {
          name: app.name,
          cuisine: app.cuisine || "Local",
          rating: 0,
          reviews: 0,
          image: `https://loremflickr.com/600/400/restaurant?lock=${randomLock()}`,
          logo: `https://loremflickr.com/100/100/logo?lock=${randomLock()}`,
          address: app.address || "",
          distanceKm: 0,
          openUntil: "—",
          verified: true,
        });
        // Link the applicant's account to their restaurant + elevate role
        await updateDoc(doc(db, "users", app.uid), {
          role: "restaurant",
          restaurantId: slug,
        });
      }
      await load();
    } catch (err) {
      console.warn("[cravely] application decision failed:", err);
      setError("Action failed — only admins can review applications.");
    } finally {
      setBusyId(null);
    }
  }

  if (!apps) {
    return (
      <div className="space-y-3">
        {[0, 1].map((i) => (
          <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-extrabold mb-1">Applications</h1>
      <p className="text-sm text-text-light mb-5">
        Approving an application lists the restaurant publicly (verified) and
        upgrades the applicant to a Restaurant account.
      </p>
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-primary">{error}</p>
      )}
      {apps.length === 0 && (
        <div className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-text-light">
          No applications yet. Restaurants can apply at{" "}
          <b>/console/restaurant</b>.
        </div>
      )}
      <div className="space-y-3">
        {apps.map((a) => (
          <div
            key={a.id}
            className="rounded-xl border border-line bg-card p-4 shadow-card"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-bold flex items-center gap-2 flex-wrap">
                  {a.name}
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${STATUS_STYLES[a.status]}`}
                  >
                    {a.status}
                  </span>
                </div>
                <p className="text-xs text-text-light mt-1">
                  {a.cuisine} · {a.address}
                </p>
                <p className="text-xs text-text-light truncate mt-0.5">
                  by {a.email}
                </p>
              </div>
              {a.status === "pending" && (
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    disabled={busyId === a.id}
                    onClick={() => void decide(a, "rejected")}
                    className="text-xs px-3 py-1.5 rounded-full border border-line hover:bg-gray-100"
                  >
                    Reject
                  </button>
                  <button
                    disabled={busyId === a.id}
                    onClick={() => void decide(a, "approved")}
                    className="text-xs px-3 py-1.5 rounded-full bg-primary text-white font-semibold"
                  >
                    {busyId === a.id ? "…" : "Approve"}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
