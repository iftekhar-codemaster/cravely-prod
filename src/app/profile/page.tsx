"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateProfile } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";
import { isAdminRole, ROLE_LABELS } from "@/lib/user";
import { getLiked, getPackage } from "@/lib/store";

const ROLE_STYLES = {
  user: "bg-blue-100 text-blue-700",
  restaurant: "bg-purple-100 text-purple-700",
  admin: "bg-amber-100 text-amber-700",
  super_admin: "bg-gray-900 text-white",
} as const;

export default function ProfilePage() {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [stats, setStats] = useState({ liked: 0, package: 0 });
  const [memberSince, setMemberSince] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setStats({ liked: getLiked().length, package: getPackage().length });
      if (user?.metadata?.creationTime) {
        setMemberSince(
          new Date(user.metadata.creationTime).toLocaleDateString(undefined, {
            month: "short",
            year: "numeric",
          }),
        );
      }
    }, 0);
    return () => clearTimeout(t);
  }, [user]);

  async function saveName() {
    const auth = getFirebaseAuth();
    if (!auth || !auth.currentUser || !nameDraft.trim()) return;
    setSavingName(true);
    try {
      await updateProfile(auth.currentUser, { displayName: nameDraft.trim() });
      // keep Firestore profile in sync
      const { doc, updateDoc } = await import("firebase/firestore");
      const { getDb } = await import("@/lib/firebase");
      const db = getDb();
      if (db) {
        await updateDoc(doc(db, "users", auth.currentUser.uid), {
          displayName: nameDraft.trim(),
        });
      }
      window.location.reload(); // simplest way to propagate to AuthProvider
    } catch {
      setSavingName(false);
      setEditing(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    router.refresh();
  }

  /* ---------- Signed-out state ---------- */
  if (!user) {
    return (
      <div className="px-4 pt-6">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-[#ff6b81] to-[#ff9a76] p-6 text-white shadow-lg mb-5">
          <i
            className="fa-solid fa-utensils absolute -right-4 -bottom-4 text-[90px] opacity-15 rotate-12"
            aria-hidden
          />
          <h1 className="text-2xl font-extrabold leading-tight">Welcome to Cravely</h1>
          <p className="mt-1.5 text-sm opacity-90 max-w-[240px]">
            Sign in to like dishes, build packages and order from places near you.
          </p>
        </div>

        <Link
          href="/login"
          className="block w-full text-center bg-primary text-white py-3.5 rounded-full font-semibold shadow-[0_4px_10px_rgba(255,71,87,0.3)] hover:-translate-y-0.5 transition-transform"
        >
          <i className="fa-solid fa-right-to-bracket mr-2" aria-hidden />
          Login / Create account
        </Link>

        <div className="grid grid-cols-2 gap-3 mt-5">
          <QuickCard href="/console/restaurant" icon="fa-store" title="Own a restaurant?" desc="Apply for verification" />
          <QuickCard href="/packages" icon="fa-box-open" title="Package Builder" desc="Compare bundle prices nearby" />
        </div>

        <Section title="More">
          <RowLink href="/liked" icon="fa-heart" label="Liked dishes" />
        </Section>
      </div>
    );
  }

  const role = profile?.role ?? "user";
  const displayName = user.displayName ?? user.email?.split("@")[0] ?? "Guest";

  /* ---------- Signed-in state ---------- */
  return (
    <div className="pb-6">
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-primary via-[#ff6b81] to-[#ff9a76] px-5 pt-8 pb-14 text-white">
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${ROLE_STYLES[role]}`}>
            {ROLE_LABELS[role]}
          </span>
        </div>
        <p className="text-xs opacity-80">My account</p>
      </div>

      <div className="px-4 -mt-10">
        {/* Identity card */}
        <section className="rounded-2xl border border-line bg-card shadow-card p-5 relative">
          <div className="flex items-center gap-4">
            {user.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.photoURL}
                alt=""
                className="w-16 h-16 rounded-full object-cover ring-4 ring-white shadow-md"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-extrabold uppercase ring-4 ring-white shadow-md">
                {displayName.charAt(0)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              {editing ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && void saveName()}
                    className="flex-1 min-w-0 rounded-lg border border-line px-2.5 py-1.5 text-sm outline-none focus:border-primary"
                  />
                  <button
                    onClick={() => void saveName()}
                    disabled={savingName}
                    aria-label="Save name"
                    className="w-8 h-8 rounded-full bg-primary text-white flex-shrink-0 disabled:opacity-50"
                  >
                    <i className={`fa-solid ${savingName ? "fa-spinner fa-spin" : "fa-check"} text-xs`} aria-hidden />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setNameDraft(displayName);
                    setEditing(true);
                  }}
                  className="group flex items-center gap-2 max-w-full"
                >
                  <h1 className="text-xl font-extrabold truncate">{displayName}</h1>
                  <i
                    className="fa-solid fa-pen text-[11px] text-text-light group-hover:text-primary transition-colors flex-shrink-0"
                    aria-label="Edit name"
                  />
                </button>
              )}
              <p className="text-xs text-text-light truncate mt-0.5">{user.email}</p>
              <div className="flex items-center gap-2 mt-1.5">
                {user.emailVerified ? (
                  <span className="text-[10px] font-semibold text-green-600">
                    <i className="fa-solid fa-circle-check mr-1" aria-hidden />
                    Verified email
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-amber-500">
                    <i className="fa-solid fa-circle-exclamation mr-1" aria-hidden />
                    Email not verified
                  </span>
                )}
                {memberSince && (
                  <span className="text-[10px] text-text-light">· since {memberSince}</span>
                )}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 divide-x divide-line mt-5 pt-4 border-t border-line text-center">
            <Stat value={stats.liked} label="Liked" icon="fa-heart" />
            <Stat value={stats.package} label="In package" icon="fa-box-open" />
            <Stat
              value={role === "restaurant" ? (profile?.restaurantId ? "Live" : "Pending") : "—"}
              label={role === "restaurant" ? "Listing" : "Orders"}
              icon={role === "restaurant" ? "fa-store" : "fa-receipt"}
              isText
            />
          </div>
        </section>

        {/* Role consoles */}
        {(isAdminRole(role) || role === "restaurant") && (
          <Section title="Consoles">
            {isAdminRole(role) && (
              <RowLink
                href="/console/admin"
                icon="fa-user-shield"
                label="Admin Console"
                accent
              />
            )}
            {role === "restaurant" && (
              <RowLink
                href="/console/restaurant"
                icon="fa-store"
                label="Restaurant Console"
                accent
              />
            )}
          </Section>
        )}

        <Section title="Activity">
          <RowLink href="/liked" icon="fa-heart" label="Liked dishes" badge={stats.liked || undefined} />
          <RowLink href="/packages" icon="fa-box-open" label="My package" badge={stats.package || undefined} />
          <RowLink href="/maps" icon="fa-map-location-dot" label="Nearby map" />
        </Section>

        <Section title="Account">
          <RowLink href="/login" icon="fa-google" label="Connected sign-in methods" muted />
          <button
            onClick={() => void handleSignOut()}
            className="w-full flex items-center gap-3 rounded-xl border border-line bg-card p-4 shadow-card text-left hover:text-primary transition-colors"
          >
            <i className="fa-solid fa-right-from-bracket w-5 text-center" aria-hidden />
            <span className="text-sm font-semibold">Sign out</span>
          </button>
        </Section>
      </div>
    </div>
  );
}

function Stat({
  value,
  label,
  icon,
  isText,
}: {
  value: number | string;
  label: string;
  icon: string;
  isText?: boolean;
}) {
  return (
    <div>
      <div className="font-extrabold text-lg flex items-center justify-center gap-1.5">
        {!isText && <i className={`fa-solid ${icon} text-[11px] text-text-light`} aria-hidden />}
        {value}
      </div>
      <div className="text-[11px] text-text-light">{label}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <h2 className="font-bold text-sm mt-6 mb-3">{title}</h2>
      <div className="space-y-3">{children}</div>
    </>
  );
}

function QuickCard({
  href,
  icon,
  title,
  desc,
}: {
  href: string;
  icon: string;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-line bg-card p-4 shadow-card hover:-translate-y-0.5 transition-transform"
    >
      <span className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">
        <i className={`fa-solid ${icon}`} aria-hidden />
      </span>
      <div className="font-bold text-sm leading-tight">{title}</div>
      <p className="text-[11px] text-text-light mt-0.5 leading-snug">{desc}</p>
    </Link>
  );
}

function RowLink({
  href,
  icon,
  label,
  badge,
  accent,
  muted,
}: {
  href: string;
  icon: string;
  label: string;
  badge?: number;
  accent?: boolean;
  muted?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-xl border bg-card p-4 shadow-card hover:text-primary transition-colors ${
        accent ? "border-primary/40" : "border-line"
      }`}
    >
      <i className={`${icon.startsWith("fa-google") ? `${icon}` : `fa-solid ${icon}`} w-5 text-center${accent ? " text-primary" : ""}`} aria-hidden />
      <span className={`text-sm font-medium flex-1 ${muted ? "text-text-light" : ""}`}>
        {label}
      </span>
      {badge !== undefined && (
        <span className="bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
          {badge}
        </span>
      )}
      <i className="fa-solid fa-chevron-right text-[10px] text-text-light" aria-hidden />
    </Link>
  );
}
