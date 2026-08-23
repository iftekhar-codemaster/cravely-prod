"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { sendEmailVerification, updateProfile } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";
import { isAdminRole, ROLE_LABELS } from "@/lib/user";
import { getLiked, getPackage } from "@/lib/store";

const ROLE_STYLES = {
  user: "bg-blue-50 text-blue-600",
  restaurant: "bg-purple-50 text-purple-600",
  admin: "bg-amber-50 text-amber-600",
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
  const [verifyState, setVerifyState] = useState<"idle" | "sending" | "sent" | "error" | "toomany">("idle");

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
    if (!auth?.currentUser || !nameDraft.trim()) return;
    setSavingName(true);
    try {
      await updateProfile(auth.currentUser, { displayName: nameDraft.trim() });
      const [{ doc, updateDoc }, { getDb }] = await Promise.all([
        import("firebase/firestore"),
        import("@/lib/firebase"),
      ]);
      const db = getDb();
      if (db) {
        await updateDoc(doc(db, "users", auth.currentUser.uid), {
          displayName: nameDraft.trim(),
        });
      }
      window.location.reload();
    } catch {
      setSavingName(false);
      setEditing(false);
    }
  }

  async function sendVerification() {
    const auth = getFirebaseAuth();
    if (!auth?.currentUser) return;
    setVerifyState("sending");
    try {
      await sendEmailVerification(auth.currentUser);
      setVerifyState("sent");
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === "auth/too-many-requests") {
        setVerifyState("toomany");
      } else {
        setVerifyState("error");
      }
    }
  }

  async function confirmVerified() {
    const auth = getFirebaseAuth();
    await auth?.currentUser?.reload();
    window.location.reload();
  }

  /* ---------- Signed out ---------- */
  if (!user) {
    return (
      <div className="px-6 pt-16 pb-10">
        <div className="anim-fade-up">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-[#ff9a76] text-white flex items-center justify-center text-2xl shadow-lg rotate-3">
            <i className="fa-solid fa-utensils" aria-hidden />
          </div>
          <h1 className="text-[26px] font-extrabold leading-snug mt-5">
            Your table is
            <br />
            waiting.
          </h1>
          <p className="text-sm text-text-light mt-2 leading-relaxed max-w-[260px]">
            Sign in to save dishes, build packages and see what&apos;s good
            around Thakurgaon.
          </p>
        </div>

        <Link
          href="/login"
          className="anim-fade-up mt-7 flex items-center justify-between w-full bg-primary text-white rounded-2xl px-5 py-4 font-semibold pressable shadow-[0_6px_18px_rgba(255,71,87,0.35)]"
          style={{ animationDelay: "90ms" }}
        >
          Sign in or create account
          <i className="fa-solid fa-arrow-right" aria-hidden />
        </Link>

        <div className="mt-8 rounded-2xl border border-line bg-card divide-y divide-line anim-fade-up" style={{ animationDelay: "160ms" }}>
          <QuietRow href="/console/restaurant" icon="fa-store" title="Own a restaurant?" desc="Apply for verification" />
          <QuietRow href="/packages" icon="fa-box-open" title="Package Builder" desc="Compare bundle prices nearby" />
          <QuietRow href="/liked" icon="fa-heart" title="Liked dishes" desc="Your shortlist" />
        </div>
      </div>
    );
  }

  const role = profile?.role ?? "user";
  const displayName = user.displayName ?? user.email?.split("@")[0] ?? "Guest";

  /* ---------- Signed in ---------- */
  return (
    <div className="pb-8">
      {/* Identity block — asymmetric, airy */}
      <header className="px-6 pt-10 anim-fade-up">
        <div className="flex items-start gap-4">
          {user.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.photoURL}
              alt=""
              className="w-20 h-20 rounded-[22px] object-cover ring-1 ring-black/5 shadow-md -rotate-2"
            />
          ) : (
            <div className="w-20 h-20 rounded-[22px] bg-gradient-to-br from-primary to-[#ff8f70] text-white flex items-center justify-center text-3xl font-extrabold uppercase shadow-md -rotate-2 select-none">
              {displayName.charAt(0)}
            </div>
          )}
          <div className="pt-1 min-w-0">
            {editing ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void saveName()}
                  className="w-40 rounded-lg border border-line px-2 py-1 text-lg font-bold outline-none focus:border-primary"
                />
                <button
                  onClick={() => void saveName()}
                  disabled={savingName}
                  aria-label="Save name"
                  className="w-7 h-7 rounded-full bg-primary text-white flex-shrink-0 disabled:opacity-50"
                >
                  <i className={`fa-solid ${savingName ? "fa-spinner fa-spin" : "fa-check"} text-[10px]`} aria-hidden />
                </button>
              </div>
            ) : (
              <button onClick={() => { setNameDraft(displayName); setEditing(true); }} className="group flex items-center gap-2 max-w-full">
                <h1 className="text-2xl font-extrabold truncate">{displayName}</h1>
                <i className="fa-solid fa-pen text-[11px] text-text-light group-hover:text-primary transition-colors flex-shrink-0" aria-label="Edit name" />
              </button>
            )}
            <p className="text-xs text-text-light truncate mt-0.5">{user.email}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-lg ${ROLE_STYLES[role]}`}>
                {ROLE_LABELS[role]}
              </span>
              {memberSince && (
                <span className="text-[10px] text-text-light">
                  <i className="fa-regular fa-calendar mr-1" aria-hidden />
                  {memberSince}
                </span>
              )}
              {!user.emailVerified && (
                <span className="text-[10px] font-semibold text-amber-500">
                  <i className="fa-solid fa-circle-exclamation mr-1" aria-hidden />
                  unverified
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Stat pills */}
      <div className="px-6 mt-6 flex gap-2 overflow-x-auto no-scrollbar anim-fade-up" style={{ animationDelay: "80ms" }}>
        <StatPill icon="fa-heart" value={stats.liked} label="Liked" href="/liked" />
        <StatPill icon="fa-box-open" value={stats.package} label="In package" href="/packages" />
        {role === "restaurant" && (
          <StatPill
            icon="fa-store"
            value={profile?.restaurantId ? "Live" : "Pending"}
            label={profile?.restaurantId ? "Listing" : "Review"}
            href={profile?.restaurantId ? `/restaurants/${profile.restaurantId}` : "/console/restaurant"}
          />
        )}
        <StatPill icon="fa-shield-halved" value="—" label="Privacy" href="/maps" muted />
      </div>

      {/* Grouped lists */}
      <div className="px-6 mt-7 space-y-6">
        {(isAdminRole(role) || role === "restaurant") && (
          <Group title="Workspace">
            {isAdminRole(role) && (
              <Row href="/console/admin" icon="fa-user-shield" title="Admin console" desc="Users · applications · security" accent />
            )}
            {role === "restaurant" && (
              <Row href="/console/restaurant" icon="fa-store" title="Restaurant studio" desc="Your listing & menu" accent />
            )}
          </Group>
        )}

        <Group title="Your activity">
          <Row href="/liked" icon="fa-heart" title="Liked dishes" badge={stats.liked} />
          <Row href="/packages" icon="fa-box-open" title="My package" badge={stats.package} />
          <Row href="/search" icon="fa-magnifying-glass" title="Find something new" />
        </Group>

        <Group title="Account">
          <Row href="#" icon="fa-bell" title="Notifications" desc="Coming soon" muted disabled />
          <Row href="#" icon="fa-circle-question" title="Help & support" desc="Coming soon" muted disabled />
          {!user.emailVerified && (
            <div className="px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl bg-primary/8 text-primary flex items-center justify-center flex-shrink-0">
                  <i className="fa-solid fa-envelope text-sm" aria-hidden />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold">Verify your email</span>
                  <span className="block text-[11px] text-text-light truncate">We&apos;ll send you a free verification link</span>
                </span>
              </div>
              {verifyState === "sent" ? (
                <div className="mt-3 anim-fade-up space-y-2">
                  <p className="text-[11px] text-text-light">Verification link sent — check your inbox (and spam).</p>
                  <button
                    onClick={() => void confirmVerified()}
                    className="pressable w-full rounded-xl bg-primary text-white text-xs font-semibold py-2.5 shadow-[0_6px_18px_rgba(255,71,87,0.35)]"
                  >
                    I&apos;ve verified — refresh
                  </button>
                </div>
              ) : (
                <div className="mt-3 anim-fade-up">
                  <button
                    onClick={() => void sendVerification()}
                    disabled={verifyState === "sending"}
                    className="pressable w-full rounded-xl border border-line bg-background text-xs font-semibold text-primary py-2.5 disabled:opacity-50"
                  >
                    {verifyState === "sending" ? (
                      <>
                        <i className="fa-solid fa-spinner fa-spin mr-1.5" aria-hidden />
                        Sending…
                      </>
                    ) : verifyState === "toomany" ? (
                      "Too many emails sent. Wait a minute and try again."
                    ) : verifyState === "error" ? (
                      "Could not send the email. Try again."
                    ) : (
                      "Send verification link"
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
          <SignOutRow onSignOut={() => void signOut().then(() => router.refresh())} />
        </Group>

        <p className="text-center text-[10px] text-text-light pt-2">
          Cravely · Thakurgaon {memberSince ? `· with you since ${memberSince}` : ""}
        </p>
      </div>
    </div>
  );
}

function StatPill({
  icon,
  value,
  label,
  href,
  muted,
}: {
  icon: string;
  value: number | string;
  label: string;
  href: string;
  muted?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`pressable flex items-center gap-2 whitespace-nowrap rounded-full border border-line bg-card pl-3 pr-4 py-2 ${
        muted ? "opacity-60" : ""
      }`}
    >
      <i className={`fa-solid ${icon} text-primary text-xs`} aria-hidden />
      <span className="font-extrabold text-sm">{value}</span>
      <span className="text-xs text-text-light">{label}</span>
    </Link>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-[11px] font-bold uppercase tracking-widest text-text-light mb-2 px-1">
        {title}
      </h2>
      <div className="rounded-2xl border border-line bg-card divide-y divide-line overflow-hidden">
        {children}
      </div>
    </section>
  );
}

function Row({
  href,
  icon,
  title,
  desc,
  badge,
  accent,
  muted,
  disabled,
}: {
  href: string;
  icon: string;
  title: string;
  desc?: string;
  badge?: number;
  accent?: boolean;
  muted?: boolean;
  disabled?: boolean;
}) {
  const inner = (
    <>
      <span className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
        accent ? "bg-primary text-white" : muted ? "bg-gray-100 text-text-light" : "bg-primary/8 text-primary"
      }`}>
        <i className={`fa-solid ${icon} text-sm`} aria-hidden />
      </span>
      <span className="flex-1 min-w-0">
        <span className={`block text-sm font-semibold truncate ${muted ? "text-text-light" : ""}`}>
          {title}
          {badge ? (
            <span className="ml-2 bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full align-middle">
              {badge}
            </span>
          ) : null}
        </span>
        {desc && <span className="block text-[11px] text-text-light truncate">{desc}</span>}
      </span>
      {!disabled && <i className="fa-solid fa-chevron-right text-[10px] text-text-light" aria-hidden />}
    </>
  );
  const cls =
    "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors " +
    (disabled ? "opacity-60 cursor-default" : "hover:bg-background");
  return disabled ? (
    <div className={cls}>{inner}</div>
  ) : (
    <Link href={href} className={`${cls} pressable`}>
      {inner}
    </Link>
  );
}

function QuietRow({
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
    <Link href={href} className="flex items-center gap-3 px-4 py-3.5 hover:bg-background transition-colors">
      <i className={`fa-solid ${icon} text-primary w-5 text-center`} aria-hidden />
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-[11px] text-text-light truncate">{desc}</span>
      </span>
      <i className="fa-solid fa-chevron-right text-[10px] text-text-light" aria-hidden />
    </Link>
  );
}

function SignOutRow({ onSignOut }: { onSignOut: () => void }) {
  return (
    <button
      onClick={onSignOut}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50/60 transition-colors group"
    >
      <span className="w-9 h-9 rounded-xl bg-red-50 text-red-500 flex items-center justify-center flex-shrink-0 group-hover:bg-red-100 transition-colors">
        <i className="fa-solid fa-right-from-bracket text-sm" aria-hidden />
      </span>
      <span className="text-sm font-semibold text-red-500">Sign out</span>
    </button>
  );
}
