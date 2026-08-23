"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  collection,
  getDocs,
  query,
  serverTimestamp,
  where,
  addDoc,
} from "firebase/firestore";
import { useAuth } from "@/components/AuthProvider";
import { getDb } from "@/lib/firebase";

type Application = {
  id?: string;
  uid: string;
  email: string;
  name: string;
  cuisine: string;
  address: string;
  status: "pending" | "approved" | "rejected";
};

export default function RestaurantConsolePage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [app, setApp] = useState<Application | null>(null);
  const [loadedApp, setLoadedApp] = useState(false);
  const [form, setForm] = useState({ name: "", cuisine: "", address: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMyApplication = useCallback(async () => {
    if (!user) return;
    const db = getDb()!;
    const snap = await getDocs(
      query(collection(db, "applications"), where("uid", "==", user.uid)),
    );
    if (!snap.empty) {
      const d = snap.docs[0];
      setApp({ id: d.id, ...(d.data() as Omit<Application, "id">) });
    }
    setLoadedApp(true);
  }, [user]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login?next=/console/restaurant");
      return;
    }
    const t = setTimeout(
      () =>
        void loadMyApplication()
          .catch((e) => console.warn("[cravely] app load:", e))
          .finally(() => setLoadedApp(true)),
      0,
    );
    return () => clearTimeout(t);
  }, [loading, user, router, loadMyApplication]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !form.name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const db = getDb()!;
      await addDoc(collection(db, "applications"), {
        uid: user.uid,
        email: user.email ?? "",
        name: form.name.trim(),
        cuisine: form.cuisine.trim(),
        address: form.address.trim(),
        status: "pending",
        createdAt: serverTimestamp(),
      });
      await loadMyApplication();
    } catch (err) {
      console.warn(err);
      setError("Could not submit application. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (loading || !loadedApp) {
    return (
      <div className="px-4 pt-6">
        <div className="h-40 rounded-xl bg-gray-100 animate-pulse" />
      </div>
    );
  }

  const isRestaurant = profile?.role === "restaurant";

  return (
    <div className="px-4 pt-6">
      <div className="flex items-center gap-3 mb-5">
        <span className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-lg">
          <i className="fa-solid fa-store" aria-hidden />
        </span>
        <div>
          <h1 className="text-lg font-extrabold leading-tight">Restaurant Console</h1>
          <p className="text-xs text-text-light">
            List your restaurant on Cravely
          </p>
        </div>
      </div>

      {/* Already an approved restaurant */}
      {isRestaurant && profile?.restaurantId && (
        <section className="rounded-xl border border-green-200 bg-green-50 p-4 mb-5">
          <div className="flex items-center gap-2 font-bold text-sm text-green-700">
            <i className="fa-solid fa-circle-check" aria-hidden />
            Your listing is live & verified
          </div>
          <Link
            href={`/restaurants/${profile.restaurantId}`}
            className="mt-3 inline-block bg-green-600 text-white text-xs font-bold px-4 py-2 rounded-full"
          >
            View public page →
          </Link>
          <p className="text-[11px] text-green-700 mt-2">
            Menu management is coming soon. Contact the admin to update dishes.
          </p>
        </section>
      )}

      {/* Application status */}
      {app && (
        <section className="rounded-xl border border-line bg-card p-4 shadow-card mb-6">
          <h2 className="font-bold text-sm mb-1">{app.name}</h2>
          <p className="text-xs text-text-light mb-3">
            {app.cuisine} · {app.address}
          </p>
          {app.status === "pending" && (
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 bg-amber-50 rounded-lg p-2.5">
              <i className="fa-solid fa-hourglass-half animate-pulse" aria-hidden />
              Pending review — an admin will verify your restaurant soon.
            </div>
          )}
          {app.status === "rejected" && (
            <div className="flex items-center gap-2 text-xs font-semibold text-red-500 bg-red-50 rounded-lg p-2.5">
              <i className="fa-solid fa-circle-xmark" aria-hidden />
              Application rejected. Contact the admin for details.
            </div>
          )}
        </section>
      )}

      {/* Apply form */}
      {!isRestaurant && !app && (
        <form onSubmit={submit} className="space-y-4">
          <div className="rounded-xl border border-dashed border-line p-4 text-xs text-text-light leading-relaxed">
            <i className="fa-solid fa-circle-info mr-1.5" aria-hidden />
            Admins verify every application before your restaurant goes live.
          </div>
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-primary">{error}</p>
          )}
          <input
            required
            placeholder="Restaurant name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-xl border border-line bg-card px-4 py-3 text-sm outline-none focus:border-primary"
          />
          <input
            placeholder="Cuisine (e.g. Biryani, Fast Food)"
            value={form.cuisine}
            onChange={(e) => setForm({ ...form, cuisine: e.target.value })}
            className="w-full rounded-xl border border-line bg-card px-4 py-3 text-sm outline-none focus:border-primary"
          />
          <textarea
            rows={2}
            placeholder="Full address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="w-full rounded-xl border border-line bg-card px-4 py-3 text-sm outline-none focus:border-primary resize-none"
          />
          <button
            disabled={busy}
            className="w-full bg-primary text-white py-3 rounded-full font-semibold disabled:opacity-50 hover:shadow-[0_4px_10px_rgba(255,71,87,0.3)] transition-shadow"
          >
            {busy ? "Submitting…" : "Apply for verification"}
          </button>
        </form>
      )}
    </div>
  );
}
