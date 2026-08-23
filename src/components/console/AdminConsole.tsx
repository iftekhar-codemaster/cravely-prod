"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { isAdminRole, ROLE_LABELS } from "@/lib/user";
import {
  getAdminSecurity,
  isSetupComplete,
  ipMatchesAllowed,
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
  const setupMode = pathname.startsWith("/console/admin/setup");

  const runGate = useCallback(async () => {
    if (!user || !profile) return;
    if (!isAdminRole(profile.role)) {
      setState("denied-role");
      return;
    }
    try {
      const security = await getAdminSecurity(user.uid);
      if (setupMode || isSetupComplete(security)) {
        if (setupMode) {
          setState("ready");
          return;
        }
        // IP restriction — admins only
        const res = await fetch("/api/my-ip", { cache: "no-store" });
        const { ip } = (await res.json()) as { ip: string };
        setMyIp(ip);
        if (!ipMatchesAllowed(ip, security.allowedIps)) {
          setState("ip-blocked");
          return;
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
            <button
              onClick={() => void runGate()}
              className="mt-6 text-xs text-text-light underline hover:text-primary"
            >
              Retry passkey prompt
            </button>
          )}
        </div>
      );
    } else if (state === "need-setup") {
      screen = (
        <Blocked
          icon="fa-solid fa-user-shield"
          title="Security setup required"
          message="Before you can use the admin console you must rotate the initial password, enroll a passkey and set your allowed IPs."
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
      <div className="min-h-[70vh] flex items-start justify-center">{screen}</div>
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
          {[
            { href: "/console/admin", label: "Overview", icon: "fa-chart-line" },
            { href: "/console/admin/users", label: "Users", icon: "fa-users" },
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
            { href: "/console/admin/security", label: "Security", icon: "fa-key" },
          ].map((t) => {
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
        Signed in as {ROLE_LABELS[profile!.role]} · IP {myIp || "—"}
      </p>
    </div>
  );
}
