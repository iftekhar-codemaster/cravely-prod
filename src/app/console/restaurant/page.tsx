"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { useAuth } from "@/components/AuthProvider";
import { getImpersonation } from "@/components/ImpersonationBanner";
import { getDb } from "@/lib/firebase";
import type { Food } from "@/lib/data";
import { ApplyWizard, AddDishWizard } from "@/components/console/Wizards";
import StoryManager from "@/components/console/StoryManager";

type Application = {
  id?: string;
  uid: string;
  email: string;
  name: string;
  cuisine: string;
  address: string;
  status: "pending" | "approved" | "rejected";
};

type Tab = "status" | "menu" | "story";

export default function RestaurantConsolePage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const [as] = useState(() => getImpersonation());

  const effRestaurantId =
    as?.role === "restaurant" ? as.restaurantId : profile?.restaurantId;
  const canManageMenu =
    Boolean(effRestaurantId) &&
    (profile?.role === "super_admin" || as?.role === "restaurant" || profile?.role === "restaurant");

  const [app, setApp] = useState<Application | null>(null);
  const [loadedApp, setLoadedApp] = useState(false);
  const [tab, setTab] = useState<Tab>("status");
  const [menu, setMenu] = useState<Food[] | null>(null);
  const [adding, setAdding] = useState(false);

  const loadMyApplication = useCallback(async () => {
    if (!user) return;
    const db = getDb()!;
    const targetUid = as?.uid ?? user.uid;
    const snap = await getDocs(
      query(collection(db, "applications"), where("uid", "==", targetUid)),
    );
    if (!snap.empty) {
      const d = snap.docs[0];
      setApp({ id: d.id, ...(d.data() as Omit<Application, "id">) });
    }
    setLoadedApp(true);
  }, [user, as]);

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

  const loadMenu = useCallback(async () => {
    if (!effRestaurantId) return;
    const db = getDb()!;
    const snap = await getDocs(
      query(collection(db, "foods"), where("restaurantId", "==", effRestaurantId)),
    );
    const rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as Food[];
    rows.sort((a, b) => a.name.localeCompare(b.name));
    setMenu(rows);
  }, [effRestaurantId]);

  useEffect(() => {
    if (tab !== "menu" || !canManageMenu) return;
    const t = setTimeout(() => void loadMenu().catch(() => setMenu([])), 0);
    return () => clearTimeout(t);
  }, [tab, canManageMenu, loadMenu]);

  async function deleteDish(id: string) {
    await deleteDoc(doc(getDb()!, "foods", id));
    await loadMenu();
  }

  if (loading || !loadedApp) {
    return (
      <div className="px-4 pt-6">
        <div className="h-40 rounded-xl skel" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-6">
      <div className="flex items-center gap-3 mb-5 anim-fade-up">
        <span className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-[#ff8f70] text-white flex items-center justify-center text-lg shadow-md -rotate-3">
          <i className="fa-solid fa-store" aria-hidden />
        </span>
        <div>
          <h1 className="text-lg font-extrabold leading-tight">
            {as ? as.name : "Restaurant Studio"}
          </h1>
          <p className="text-xs text-text-light">
            {as ? `Super Admin · managing ${as.email}` : "Your listing & menu on Cravely"}
          </p>
        </div>
      </div>

      {canManageMenu && (
        <div className="flex gap-2 mb-5">
          {(["status", "menu", "story"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`text-xs font-bold px-4 py-2 rounded-full transition-colors ${
                tab === t ? "bg-primary text-white" : "border border-line bg-card"
              }`}
            >
              {t === "status" ? "Listing" : t === "menu" ? `Menu${menu ? ` (${menu.length})` : ""}` : "Story"}
            </button>
          ))}
        </div>
      )}

      {(!canManageMenu || tab === "status") && (
        <StatusPanel app={app} isLive={Boolean(effRestaurantId)} />
      )}

      {canManageMenu && tab === "menu" && (
        <section>
          <button
            onClick={() => setAdding(true)}
            className="anim-pop w-full bg-primary text-white rounded-full py-3 font-semibold text-sm pressable shadow-[0_4px_12px_rgba(255,71,87,0.3)]"
          >
            <i className="fa-solid fa-plus mr-2" aria-hidden />
            Add a dish
          </button>

          {!menu ? (
            <div className="space-y-3 mt-5">
              {[0, 1].map((i) => (
                <div key={i} className="h-16 rounded-xl skel" />
              ))}
            </div>
          ) : menu.length === 0 ? (
            <p className="text-sm text-text-light text-center py-8">
              No dishes yet — publish your first one above.
            </p>
          ) : (
            <ul className="mt-5 space-y-3 pb-24">
              {menu.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center gap-3 rounded-xl border border-line bg-card p-3 shadow-card"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.image} alt="" loading="lazy" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <Link href={`/product/${f.id}`} className="text-sm font-semibold truncate block hover:text-primary">
                      {f.name}
                    </Link>
                    <p className="text-xs text-text-light">{f.category}</p>
                  </div>
                  <span className="font-bold text-sm">৳{f.price}</span>
                  <button
                    onClick={() => void deleteDish(f.id).catch(() => alert("Delete failed"))}
                    aria-label={`Delete ${f.name}`}
                    className="w-7 h-7 rounded-full bg-background text-text-light hover:text-red-500 transition-colors"
                  >
                    <i className="fa-solid fa-trash text-xs" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {canManageMenu && tab === "story" && (
        <StoryManager restaurantId={effRestaurantId!} />
      )}

      {adding && effRestaurantId && (
        <AddDishWizard
          restaurantId={effRestaurantId}
          onClose={() => setAdding(false)}
          onAdded={() => {
            setAdding(false);
            void loadMenu();
          }}
        />
      )}
    </div>
  );
}

function StatusPanel({
  app,
  isLive,
}: {
  app: Application | null;
  isLive: boolean;
}) {
  if (isLive) {
    return (
      <section className="rounded-2xl border border-green-200 bg-green-50 p-5 anim-fade-up">
        <div className="flex items-center gap-2 font-bold text-sm text-green-700">
          <i className="fa-solid fa-circle-check" aria-hidden />
          Your listing is live & verified
        </div>
        <p className="text-xs text-green-700 mt-1.5">
          Dishes you publish appear instantly across Cravely.
        </p>
      </section>
    );
  }

  if (app) {
    return (
      <section className="rounded-2xl border border-line bg-card p-5 shadow-card anim-fade-up">
        <h2 className="font-bold text-sm mb-1">{app.name}</h2>
        <p className="text-xs text-text-light mb-3">
          {app.cuisine} · {app.address}
        </p>
        {app.status === "pending" && (
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 bg-amber-50 rounded-lg p-3">
            <i className="fa-solid fa-hourglass-half animate-pulse" aria-hidden />
            Pending review — an admin will verify your restaurant soon.
          </div>
        )}
        {app.status === "rejected" && (
          <div className="flex items-center gap-2 text-xs font-semibold text-red-500 bg-red-50 rounded-lg p-3">
            <i className="fa-solid fa-circle-xmark" aria-hidden />
            Application rejected. Contact the admin for details.
          </div>
        )}
      </section>
    );
  }

  return <ApplyWizard />;
}
