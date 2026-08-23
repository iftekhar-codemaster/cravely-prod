"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, doc, getDocs, updateDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";
import { ROLE_LABELS, type Role, type UserProfile } from "@/lib/user";
import { startImpersonation } from "@/components/ImpersonationBanner";

const ROLES: Role[] = ["user", "restaurant", "admin"];

const PERMS = [
  { key: "users", label: "Manage users", icon: "fa-users" },
  { key: "applications", label: "Review applications", icon: "fa-file-signature" },
  { key: "restaurants", label: "Manage restaurants", icon: "fa-store" },
  { key: "content", label: "Edit content", icon: "fa-pen-to-square" },
] as const;

type PermKey = (typeof PERMS)[number]["key"];

export default function AdminUsersPage() {
  const { profile: me } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserProfile[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permUser, setPermUser] = useState<UserProfile | null>(null);

  const load = useCallback(async () => {
    const db = getDb()!;
    const snap = await getDocs(collection(db, "users"));
    setUsers(snap.docs.map((d) => ({ ...(d.data() as UserProfile), uid: d.id })));
  }, []);

  useEffect(() => {
    const t = setTimeout(
      () => void load().catch(() => setError("Could not load users.")),
      0,
    );
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function changeRole(uid: string, role: Role) {
    setError(null);
    try {
      await updateDoc(doc(getDb()!, "users", uid), { role });
      await load();
    } catch {
      setError("Only the Super Admin can change roles.");
    }
  }

  async function savePerm(uid: string, perm: PermKey, on: boolean, current: string[]) {
    const next = on ? [...new Set([...current, perm])] : current.filter((p) => p !== perm);
    try {
      await updateDoc(doc(getDb()!, "users", uid), { perms: next });
      setPermUser((u) => (u ? { ...u, perms: next } : u));
      await load();
    } catch {
      setError("Could not update permissions.");
    }
  }

  function viewAs(u: UserProfile) {
    startImpersonation({
      uid: u.uid,
      name: u.displayName || u.email,
      email: u.email,
      role: u.role === "restaurant" ? "restaurant" : "user",
      restaurantId: u.restaurantId,
    });
    router.push(u.role === "restaurant" ? "/console/restaurant" : "/");
  }

  if (!users) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  const isSuper = me?.role === "super_admin";
  const admins = users.filter((u) => u.role === "admin");

  return (
    <div>
      <h1 className="text-xl font-extrabold mb-1">Users ({users.length})</h1>
      <p className="text-sm text-text-light mb-5">
        {isSuper
          ? "Promote members to admin, set their console permissions, or view the app as them."
          : "Read-only — only the Super Admin manages accounts."}
      </p>
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-primary">{error}</p>
      )}

      {/* Quick admin summary for super admin */}
      {isSuper && (
        <div className="mb-4 rounded-xl border border-line bg-card p-3 text-xs flex items-center gap-2">
          <i className="fa-solid fa-user-shield text-primary" aria-hidden />
          <span className="text-text-light">
            {admins.length} admin{admins.length === 1 ? "" : "s"} with passkey access · you can grant granular perms per admin
          </span>
        </div>
      )}

      <div className="space-y-3 pb-24">
        {users.map((u) => (
          <div
            key={u.uid}
            className="rounded-xl border border-line bg-card p-3 shadow-card"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold uppercase flex-shrink-0">
                {(u.displayName || u.email).charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate flex items-center gap-2">
                  {u.displayName || "—"}
                  {u.email === me?.email && (
                    <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">you</span>
                  )}
                </div>
                <div className="text-xs text-text-light truncate">{u.email}</div>
              </div>
              {u.role === "super_admin" ? (
                <span className="text-[11px] font-bold text-white bg-gray-900 px-2.5 py-1 rounded-full flex-shrink-0">
                  OWNER
                </span>
              ) : (
                <select
                  value={u.role}
                  onChange={(e) => void changeRole(u.uid, e.target.value as Role)}
                  disabled={!isSuper}
                  aria-label={`Role for ${u.email}`}
                  className="text-xs border border-line rounded-full px-2.5 py-1.5 bg-background font-semibold disabled:opacity-60"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Super admin actions */}
            {isSuper && u.role !== "super_admin" && (
              <div className="flex gap-2 mt-3 pt-3 border-t border-line">
                <button
                  onClick={() => setPermUser(u)}
                  disabled={u.role !== "admin"}
                  title={u.role !== "admin" ? "Only admins have console perms" : undefined}
                  className="flex-1 text-[11px] font-semibold border border-line rounded-full py-1.5 hover:border-primary hover:text-primary transition-colors disabled:opacity-40"
                >
                  <i className="fa-solid fa-sliders mr-1.5" aria-hidden />
                  Permissions{u.perms?.length ? ` (${u.perms.length})` : ""}
                </button>
                <button
                  onClick={() => viewAs(u)}
                  className="flex-1 text-[11px] font-semibold border border-line rounded-full py-1.5 hover:border-primary hover:text-primary transition-colors"
                >
                  <i className="fa-solid fa-eye mr-1.5" aria-hidden />
                  View as
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Perms modal */}
      {permUser && (
        <div
          className="fixed inset-0 z-[70] bg-black/40 flex items-end sm:items-center justify-center p-4"
          onClick={() => setPermUser(null)}
          role="dialog"
          aria-modal
          aria-label={`Permissions for ${permUser.email}`}
        >
          <div
            className="anim-fade-up w-full max-w-md bg-white rounded-2xl p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-extrabold mb-1">
              Permissions · {permUser.displayName || permUser.email}
            </h3>
            <p className="text-xs text-text-light mb-4">
              Controls which console areas this admin can use.
            </p>
            <div className="space-y-2">
              {PERMS.map((p) => {
                const on = (permUser.perms ?? []).includes(p.key);
                return (
                  <label
                    key={p.key}
                    className="flex items-center gap-3 rounded-xl border border-line px-4 py-3 cursor-pointer pressable"
                  >
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${on ? "bg-primary text-white" : "bg-gray-100 text-text-light"}`}>
                      <i className={`fa-solid ${p.icon} text-xs`} aria-hidden />
                    </span>
                    <span className="flex-1 text-sm font-semibold">{p.label}</span>
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={(e) =>
                        void savePerm(permUser.uid, p.key, e.target.checked, permUser.perms ?? [])
                      }
                      className="accent-primary w-4 h-4"
                    />
                  </label>
                );
              })}
            </div>
            <button
              onClick={() => setPermUser(null)}
              className="mt-5 w-full bg-gray-900 text-white rounded-full py-3 font-semibold text-sm"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
