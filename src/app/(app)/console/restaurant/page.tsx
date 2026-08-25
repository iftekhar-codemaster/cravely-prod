"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { useAuth } from "@/components/AuthProvider";
import { getImpersonation } from "@/components/ImpersonationBanner";
import { getDb } from "@/lib/firebase";
import { audit } from "@/lib/audit";
import SmartImg from "@/components/SmartImg";
import type { Food } from "@/lib/data";
import { isAdminRole } from "@/lib/user";
import { ApplyWizard, AddDishWizard } from "@/components/console/Wizards";
import StoryManager from "@/components/console/StoryManager";
import OfferManager from "@/components/console/OfferManager";
import StoryComposer from "@/components/console/StoryComposer";
import SettingsTab from "@/components/console/SettingsTab";
import LocationSetter from "@/components/console/LocationSetter";

type Application = {
  id?: string;
  uid: string;
  email: string;
  name: string;
  cuisine: string;
  address: string;
  status: "pending" | "approved" | "rejected";
};

type Tab = "listing" | "add" | "menu" | "settings";

const TABS: Tab[] = ["listing", "add", "menu", "settings"];

export default function RestaurantConsolePage() {
  return (
    <Suspense
      fallback={
        <div className="px-4 pt-6">
          <div className="h-40 rounded-xl skel" />
        </div>
      }
    >
      <RestaurantStudio />
    </Suspense>
  );
}

function RestaurantStudio() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [as] = useState(() => getImpersonation());

  const rawTab = searchParams.get("tab");
  const tab: Tab = TABS.includes(rawTab as Tab) ? (rawTab as Tab) : "listing";

  const effRestaurantId =
    as?.role === "restaurant" ? as.restaurantId : profile?.restaurantId;
  const canManageMenu =
    Boolean(effRestaurantId) &&
    (profile?.role === "super_admin" || as?.role === "restaurant" || profile?.role === "restaurant");

  const [app, setApp] = useState<Application | null>(null);
  const [loadedApp, setLoadedApp] = useState(false);
  const [menu, setMenu] = useState<Food[] | null>(null);
  const [restCoords, setRestCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [restInfo, setRestInfo] = useState<{
    name: string;
    logo: string;
    rating: number;
    verified: boolean;
  } | null>(null);
  const [composing, setComposing] = useState(false);
  const [storiesVersion, setStoriesVersion] = useState(0);

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
    if (!canManageMenu || !effRestaurantId) return;
    const t = setTimeout(() => void loadMenu().catch(() => setMenu([])), 0);
    return () => clearTimeout(t);
  }, [canManageMenu, effRestaurantId, loadMenu, tab]);

  useEffect(() => {
    if (!effRestaurantId) return;
    const t = setTimeout(async () => {
      try {
        const snap = await getDoc(doc(getDb()!, "restaurants", effRestaurantId));
        const d = snap.data() as
          | { lat?: number; lng?: number; name?: string; logo?: string; rating?: number; verified?: boolean }
          | undefined;
        if (d) {
          if (typeof d.lat === "number" && typeof d.lng === "number") {
            setRestCoords({ lat: d.lat, lng: d.lng });
          }
          setRestInfo({
            name: d.name ?? "Your restaurant",
            logo: d.logo ?? "",
            rating: d.rating ?? 0,
            verified: Boolean(d.verified),
          });
        }
      } catch (e) {
        console.warn("[cravely] restaurant load:", e);
      }
    }, 0);
    return () => clearTimeout(t);
  }, [effRestaurantId]);

  async function deleteDish(id: string) {
    await deleteDoc(doc(getDb()!, "foods", id));
    void audit("food.delete", id);
    await loadMenu();
  }

  if (loading || !loadedApp) {
    return (
      <div className="px-4 pt-6">
        <div className="h-40 rounded-xl skel" />
      </div>
    );
  }

  const name = as?.name ?? restInfo?.name ?? "Restaurant Studio";
  const logo = restInfo?.logo ?? "";

  return (
    <div className="px-4 pt-6">
      {/* ===== Listing tab ===== */}
      {tab === "listing" && (
        <>
          {canManageMenu && effRestaurantId ? (
            <>
              {/* Profile header: logo + story badge, name */}
              <div className="flex items-center gap-4 anim-fade-up">
                <div className="relative flex-shrink-0">
                  <span className="w-20 h-20 rounded-full p-[3px] bg-[linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)] block">
                    <SmartImg
                      src={logo}
                      alt={name}
                      className="w-full h-full rounded-full ring-[3px] ring-background bg-gray-100"
                      imgClassName="w-full h-full object-cover"
                    />
                  </span>
                  <button
                    onClick={() => setComposing(true)}
                    aria-label="Add to story"
                    className="absolute -right-0.5 -bottom-0.5 w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center shadow-md ring-2 ring-white hover:scale-105 active:scale-95 transition-transform"
                  >
                    <i className="fa-solid fa-plus text-xs" aria-hidden />
                  </button>
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg font-extrabold truncate flex items-center gap-1.5">
                    {name}
                    {restInfo?.verified && (
                      <i className="fa-solid fa-circle-check text-primary text-sm" title="Verified" aria-label="Verified" />
                    )}
                  </h1>
                  <p className="text-xs text-text-light">
                    {as ? `Super Admin · ${as.email}` : "Your studio on Cravely"}
                  </p>
                </div>
              </div>

              {/* Overview */}
              <section className="mt-6">
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-text-light mb-2">
                  Overview
                </h2>
                <div className="grid grid-cols-3 gap-3">
                  <OverviewStat
                    icon="fa-bowl-food"
                    value={menu ? String(menu.length) : "…"}
                    label="Dishes"
                    onClick={() => router.replace("/console/restaurant?tab=menu")}
                  />
                  <OverviewStat
                    icon="fa-circle-play"
                    value={<StoryCount restaurantId={effRestaurantId} version={storiesVersion} />}
                    label="Stories"
                    onClick={() => setComposing(true)}
                  />
                  <OverviewStat
                    icon="fa-star"
                    value={restInfo ? restInfo.rating.toFixed(1) : "…"}
                    label="Rating"
                  />
                </div>
              </section>

              {/* Status */}
              <div className="mt-5">
                <StatusPanel app={app} isLive={Boolean(effRestaurantId)} />
              </div>

              {/* Listings */}
              <section className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-[11px] font-bold uppercase tracking-widest text-text-light">
                    Listings
                  </h2>
                  <Link
                    href="/console/restaurant?tab=add"
                    className="text-[11px] font-semibold text-primary"
                  >
                    <i className="fa-solid fa-plus mr-1" aria-hidden />
                    Add dish
                  </Link>
                </div>
                <MenuList menu={menu} onDelete={(id) => void deleteDish(id).catch(() => alert("Delete failed"))} />
              </section>

              <div className="mt-6">
                <LocationSetter
                  restaurantId={effRestaurantId}
                  initialLat={restCoords?.lat}
                  initialLng={restCoords?.lng}
                />
              </div>

              <div className="mt-6 pb-24">
                <StoryManager
                  key={storiesVersion}
                  restaurantId={effRestaurantId}
                />
                <div className="mt-6">
                  <OfferManager
                    restaurantId={effRestaurantId}
                    canWrite={isAdminRole(profile?.role)}
                  />
                </div>
              </div>
            </>
          ) : (
            <StatusPanel app={app} isLive={false} />
          )}
        </>
      )}

      {/* ===== Add tab ===== */}
      {tab === "add" && canManageMenu && effRestaurantId && (
        <div className="pb-24">
          <AddDishWizard
            restaurantId={effRestaurantId}
            inline
            onAdded={() => {
              void loadMenu();
              router.replace("/console/restaurant?tab=menu");
            }}
          />
        </div>
      )}

      {/* ===== Menu tab ===== */}
      {tab === "menu" && canManageMenu && (
        <section className="pb-24">
          <h1 className="text-xl font-extrabold mb-1">
            <i className="fa-solid fa-book-open text-primary mr-2" aria-hidden />
            Menu
          </h1>
          <p className="text-sm text-text-light mb-5">
            {menu ? `${menu.length} dishes live` : "Loading…"}
          </p>
          <MenuList
            menu={menu}
            onDelete={(id) => void deleteDish(id).catch(() => alert("Delete failed"))}
          />
        </section>
      )}

      {/* ===== Settings tab ===== */}
      {tab === "settings" && canManageMenu && effRestaurantId && (
        <div className="pb-24">
          <SettingsTab restaurantId={effRestaurantId} />
        </div>
      )}

      {composing && effRestaurantId && (
        <StoryComposer
          restaurantId={effRestaurantId}
          restaurantName={name}
          onClose={() => setComposing(false)}
          onPublished={() => {
            setComposing(false);
            setStoriesVersion((v) => v + 1);
          }}
        />
      )}
    </div>
  );
}

function OverviewStat({
  icon,
  value,
  label,
  onClick,
}: {
  icon: string;
  value: string | React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  const body = (
    <div className={`rounded-2xl border border-line bg-card p-3 text-center shadow-card ${onClick ? "pressable hover:-translate-y-0.5 transition-transform" : ""}`}>
      <i className={`fa-solid ${icon} text-primary text-sm`} aria-hidden />
      <div className="font-extrabold text-lg mt-1">{value}</div>
      <div className="text-[10px] text-text-light">{label}</div>
    </div>
  );
  return onClick ? (
    <button onClick={onClick} className="w-full">
      {body}
    </button>
  ) : (
    body
  );
}

function StoryCount({
  restaurantId,
  version,
}: {
  restaurantId: string;
  version: number;
}) {
  const [count, setCount] = useState<string>("…");
  useEffect(() => {
    const t = setTimeout(async () => {
      const snap = await getDocs(
        query(collection(getDb()!, "stories"), where("restaurantId", "==", restaurantId)),
      );
      setCount(String(snap.size));
    }, 0);
    return () => clearTimeout(t);
  }, [restaurantId, version]);
  return <>{count}</>;
}

function MenuList({
  menu,
  onDelete,
}: {
  menu: Food[] | null;
  onDelete: (id: string) => void;
}) {
  if (!menu) {
    return (
      <div className="space-y-3">
        {[0, 1].map((i) => (
          <div key={i} className="h-16 rounded-xl skel" />
        ))}
      </div>
    );
  }
  if (menu.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-text-light">
        No dishes yet.
      </div>
    );
  }
  return (
    <ul className="space-y-3">
      {menu.map((f) => (
        <li
          key={f.id}
          className="flex items-center gap-3 rounded-xl border border-line bg-card p-3 shadow-card"
        >
          <SmartImg
            src={f.image}
            alt=""
            className="w-12 h-12 rounded-lg bg-gray-100 flex-shrink-0"
            imgClassName="w-full h-full object-cover"
          />
          <div className="flex-1 min-w-0">
            <Link
              href={`/product/${f.id}`}
              className="text-sm font-semibold truncate block hover:text-primary"
            >
              {f.name}
            </Link>
            <p className="text-xs text-text-light">{f.category}</p>
          </div>
          <span className="font-bold text-sm">৳{f.price}</span>
          <button
            onClick={() => onDelete(f.id)}
            aria-label={`Delete ${f.name}`}
            className="w-7 h-7 rounded-full bg-background text-text-light hover:text-red-500 transition-colors flex-shrink-0"
          >
            <i className="fa-solid fa-trash text-xs" aria-hidden />
          </button>
        </li>
      ))}
    </ul>
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
      <section className="rounded-2xl border border-green-200 bg-green-50 p-4 anim-fade-up">
        <div className="flex items-center gap-2 font-bold text-sm text-green-700">
          <i className="fa-solid fa-circle-check" aria-hidden />
          Listing is live & verified
        </div>
        <p className="text-xs text-green-700 mt-1">
          Dishes and stories you publish appear instantly across Cravely.
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
