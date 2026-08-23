"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export type Impersonation = {
  uid: string;
  name: string;
  email: string;
  role: "user" | "restaurant";
  restaurantId?: string;
};

const KEY = "cravely:as";

export function getImpersonation(): Impersonation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Impersonation) : null;
  } catch {
    return null;
  }
}

/** Super admin only — start viewing the app as someone else. */
export function startImpersonation(target: Impersonation): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(KEY, JSON.stringify(target));
}

export function stopImpersonation(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(KEY);
}

const ROLE_ICON = { user: "fa-user", restaurant: "fa-store" } as const;

export default function ImpersonationBanner() {
  const [as, setAs] = useState<Impersonation | null>(null);
  const router = useRouter();

  useEffect(() => {
    const sync = () => setAs(getImpersonation());
    const t = setTimeout(sync, 0);
    window.addEventListener("focus", sync);
    return () => {
      clearTimeout(t);
      window.removeEventListener("focus", sync);
    };
  }, []);

  if (!as) return null;

  function exit() {
    if (!as) return;
    void import("@/lib/audit").then((m) => m.audit("impersonation.stop", as.uid));
    stopImpersonation();
    setAs(null);
    router.push("/console/admin/users");
    router.refresh();
  }

  return (
    <div className="sticky top-0 z-[60] bg-gray-900 text-white px-4 py-2 flex items-center gap-2 text-xs">
      <i className={`fa-solid ${ROLE_ICON[as.role]} text-primary`} aria-hidden />
      <span className="flex-1 truncate">
        Viewing as <b>{as.name}</b>
        <span className="text-gray-400"> · changes you make act on their data</span>
      </span>
      <button
        onClick={exit}
        className="bg-white/10 hover:bg-white/20 transition-colors rounded-full px-3 py-1 font-semibold"
      >
        Exit
      </button>
    </div>
  );
}
