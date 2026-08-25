"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { isAdminRole } from "@/lib/user";
import {
  getAdminSecurity,
  getSystemSettings,
  ipMatchesAllowed,
  missingRequirements,
  resetPasskeys,
  verifyPasskey,
} from "@/lib/adminSecurity";

type GateState =
  | "loading"
  | "denied-role"
  | "need-setup"
  | "ip-blocked"
  | "passkey"
  | "ready";

function Blocked({
  icon,
  title,
  message,
  children,
}: {
  icon: string;
  title: string;
  message: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="px-6 pt-20 text-center">
      <div className="mx-auto mb-5 w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl">
        <i className={icon} aria-hidden />
      </div>
      <h1 className="text-xl font-extrabold mb-2">{title}</h1>
      <p className="text-sm text-text-light max-w-xs mx-auto leading-relaxed">
        {message}
      </p>
      {children && <div className="mt-6 flex justify-center gap-3">{children}</div>}
    </div>
  );
}

export default function ConsoleShell({ children }: { children: ReactNode }) {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const [state, setState] = useState<GateState>("loading");
  const [myIp, setMyIp] = useState("");
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryPw, setRecoveryPw] = useState("");
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [recoveryErr, setRecoveryErr] = useState<string | null>(null);
  const [recoveryEnabled, setRecoveryEnabled] = useState(true);
  const setupMode = pathname.startsWith("/console/admin/setup");

  async function recoverWithPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setRecoveryBusy(true);
    setRecoveryErr(null);
    try {
      const { EmailAuthProvider, reauthenticateWithCredential } = await import(
        "firebase/auth"
      );
      const cred = EmailAuthProvider.credential(user.email!, recoveryPw);
      await reauthenticateWithCredential(user, cred);
      await resetPasskeys(user.uid);
      sessionStorage.removeItem("cravely:passkey-ok");
      setShowRecovery(false);
      setRecoveryPw("");
      router.replace("/console/admin/setup");
    } catch {
      setRecoveryErr("Incorrect password.");
    } finally {
      setRecoveryBusy(false);
    }
  }

  const runGate = useCallback(async () => {
    if (!user || !profile) return;
    if (!isAdminRole(profile.role)) {
      setState("denied-role");
      return;
    }
    try {
      const [security, sys] = await Promise.all([
        getAdminSecurity(user.uid),
        getSystemSettings(),
      ]);
      setRecoveryEnabled(sys.passkeyRecovery);
      const role = profile.role === "super_admin" ? "super_admin" : "admin";
      const missing = missingRequirements(security, role);
      if (setupMode) {
        // Setup page only needs the role; wizard decides what's still required
        setState("ready");
        return;
      }
      if (missing.length === 0) {
        // IP restriction — super admins only, when the toggle is on
        if (role === "super_admin" && sys.ipAllowlistEnabled) {
          const res = await fetch("/api/my-ip", { cache: "no-store" });
          const { ip } = (await res.json()) as { ip: string };
          setMyIp(ip);
          if (!ipMatchesAllowed(ip, security.allowedIps)) {
            setState("ip-blocked");
            return;
          }
        }
        // Passkey challenge once per browser session
        const verified = sessionStorage.getItem("cravely:passkey-ok");
        if (verified === user.uid) {
          setState("ready");
          return;
        }
        setState("passkey");
        const ok = await verifyPasskey(user.uid);
        if (ok) {
          sessionStorage.setItem("cravely:passkey-ok", user.uid);
          setState("ready");
        } else {
          setState("passkey");
        }
        return;
      }
      setState("need-setup");
    } catch (err) {
      console.warn("[cravely] admin gate:", err);
      setState("denied-role");
    }
  }, [user, profile, setupMode]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login?next=/console/admin");
      return;
    }
    if (!profile) return; // still resolving profile
    const t = setTimeout(() => void runGate(), 0);
    return () => clearTimeout(t);
  }, [authLoading, user, profile, router, runGate]);

  if (state !== "ready") {
    let screen: ReactNode;
    if (state === "loading" || state === "passkey") {
      screen = (
        <div className="px-6 pt-24 text-center">
          <i
            className="fa-solid fa-shield-halved text-4xl text-primary animate-pulse"
            aria-hidden
          />
          <p className="mt-5 text-sm text-text-light">
            {state === "passkey"
              ? "Use your passkey to unlock the admin console…"
              : "Verifying your access…"}
          </p>
          {state === "passkey" && (
            <div className="mt-6 flex flex-col items-center gap-3">
              <button
                onClick={() => void runGate()}
                className="text-xs text-text-light underline hover:text-primary"
              >
                Retry passkey prompt
              </button>
              {recoveryEnabled && (
                <button
                  onClick={() => setShowRecovery(true)}
                  className="text-[11px] text-text-light hover:text-primary transition-colors"
                >
                  Changed domain or lost the passkey? Recover with password →
                </button>
              )}
            </div>
          )}
        </div>
      );
    } else if (state === "need-setup") {
      screen = (
        <Blocked
          icon="fa-solid fa-user-shield"
          title="Security setup required"
          message="Before you can use the admin console you need to finish the quick security wizard (passkey, and for owners: password & IPs)."
        >
          <Link
            href="/console/admin/setup"
            className="bg-primary text-white px-6 py-2.5 rounded-full font-semibold text-sm hover:shadow-[0_4px_10px_rgba(255,71,87,0.3)] transition-shadow"
          >
            Start setup
          </Link>
        </Blocked>
      );
    } else if (state === "ip-blocked") {
      screen = (
        <Blocked
          icon="fa-solid fa-network-wired"
          title="IP not allowed"
          message={
            <>
              Your current IP <b>{myIp}</b> is not on this account&apos;s allowlist.
              Ask the owner to add it, or sign in from an approved network.
            </>
          }
        />
      );
    } else {
      screen = (
        <Blocked
          icon="fa-solid fa-lock"
          title="Access denied"
          message="This area is restricted to Cravely administrators."
        >
          <Link
            href="/profile"
            className="border border-line px-5 py-2.5 rounded-full font-semibold text-sm"
          >
            Back to profile
          </Link>
        </Blocked>
      );
    }
    return (
      <div className="min-h-[70vh] flex items-start justify-center">
        {screen}
        {showRecovery && (
          <div
            className="fixed inset-0 z-[80] bg-black/40 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Passkey recovery"
          >
            <form
              onSubmit={recoverWithPassword}
              className="anim-fade-up w-full max-w-sm bg-white rounded-2xl p-5 shadow-xl"
            >
              <h3 className="font-extrabold mb-1">Passkey recovery</h3>
              <p className="text-xs text-text-light leading-relaxed mb-4">
                Passkeys only work on the domain they were created on. Confirm
                your password to clear old passkeys and enroll a new one on this
                domain.
              </p>
              {recoveryErr && (
                <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-primary">
                  {recoveryErr}
                </p>
              )}
              <input
                type="password"
                autoFocus
                value={recoveryPw}
                onChange={(e) => setRecoveryPw(e.target.value)}
                placeholder="Account password"
                required
                className="w-full rounded-xl border border-line bg-card px-4 py-3 text-sm outline-none focus:border-primary"
              />
              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setShowRecovery(false)}
                  className="flex-1 border border-line rounded-full py-2.5 font-semibold text-sm"
                >
                  Cancel
                </button>
                <button
                  disabled={recoveryBusy}
                  className="flex-[2] bg-primary text-white rounded-full py-2.5 font-semibold text-sm disabled:opacity-50"
                >
                  {recoveryBusy ? "Verifying…" : "Reset passkeys"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="pb-8">
      {/* Console header */}
      <header className="sticky top-0 z-40 bg-gray-900 text-white shadow-lg">
        <div className="px-4 py-3 flex items-center gap-3">
          <span className="w-8 h-8 rounded-lg bg-primary/90 flex items-center justify-center text-sm">
            <i className="fa-solid fa-user-shield" aria-hidden />
          </span>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm leading-tight">Admin Console</div>
            <div className="text-[11px] text-gray-400 truncate">
              {profile?.email}
            </div>
          </div>
          <Link
            href="/"
            className="text-[11px] bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full transition-colors"
          >
            Exit
          </Link>
        </div>
        <nav className="px-2 pb-2 flex gap-1 overflow-x-auto no-scrollbar text-xs font-semibold">
          {([
            { href: "/console/admin", label: "Overview", icon: "fa-chart-line" },
            {
              href: "/console/admin/users",
              label: "Users",
              icon: "fa-users",
              superOnly: false,
            },
            {
              href: "/console/admin/applications",
              label: "Applications",
              icon: "fa-file-signature",
            },
            {
              href: "/console/admin/restaurants",
              label: "Restaurants",
              icon: "fa-store",
            },
            { href: "/console/admin/audit", label: "Audit", icon: "fa-clipboard-list" },
            {
              href: "/console/admin/notifications",
              label: "Notifications",
              icon: "fa-bullhorn",
            },
            {
              href: "/console/admin/database",
              label: "Database",
              icon: "fa-database",
              superOnly: true,
            },
            {
              href: "/console/admin/storage",
              label: "Storage",
              icon: "fa-cloud-arrow-up",
              superOnly: true,
            },
            { href: "/console/admin/security", label: "Security", icon: "fa-key" },
          ] as { href: string; label: string; icon: string; superOnly?: boolean }[]).map((t) => {
            if (t.superOnly && profile?.role !== "super_admin") return null;
            const active = pathname === t.href;
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`whitespace-nowrap px-3 py-1.5 rounded-full transition-colors ${
                  active ? "bg-primary text-white" : "text-gray-300 hover:bg-white/10"
                }`}
              >
                <i className={`fa-solid ${t.icon} mr-1.5`} aria-hidden />
                {t.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="px-4 pt-5">{children}</main>
      <p className="mt-8 text-center text-[11px] text-text-light">
        Signed in as {profile!.role === "super_admin" ? "Super Admin" : "Admin"} · IP {myIp || "—"}
      </p>
    </div>
  );
}
