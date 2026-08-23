"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";
import { ROLE_LABELS, type Role, type UserProfile } from "@/lib/user";

const ROLES: Role[] = ["user", "restaurant", "admin"];

export default function AdminUsersPage() {
  const { profile: me } = useAuth();
  const [users, setUsers] = useState<UserProfile[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const db = getDb()!;
    const snap = await getDocs(collection(db, "users"));
    setUsers(snap.docs.map((d) => ({ ...(d.data() as UserProfile), uid: d.id })));
  }

  useEffect(() => {
    const t = setTimeout(
      () => void load().catch(() => setError("Could not load users.")),
      0,
    );
    return () => clearTimeout(t);
     
  }, []);

  async function changeRole(uid: string, role: Role) {
    setError(null);
    try {
      await updateDoc(doc(getDb()!, "users", uid), { role });
      await load();
    } catch {
      setError(
        "Only the Super Admin can change roles (and cannot demote themselves here).",
      );
    }
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

  return (
    <div>
      <h1 className="text-xl font-extrabold mb-5">Users ({users.length})</h1>
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-primary">{error}</p>
      )}
      <div className="space-y-3">
        {users.map((u) => (
          <div
            key={u.uid}
            className="flex items-center gap-3 rounded-xl border border-line bg-card p-3 shadow-card"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold uppercase flex-shrink-0">
              {(u.displayName || u.email).charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">
                {u.displayName || "—"}
                {u.email === me?.email && (
                  <span className="ml-2 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full align-middle">
                    you
                  </span>
                )}
              </div>
              <div className="text-xs text-text-light truncate">{u.email}</div>
            </div>
            {u.role === "super_admin" ? (
              <span className="text-[11px] font-bold text-white bg-gray-900 px-2.5 py-1 rounded-full">
                SUPER ADMIN
              </span>
            ) : (
              <select
                value={u.role}
                onChange={(e) => void changeRole(u.uid, e.target.value as Role)}
                disabled={me?.role !== "super_admin"}
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
        ))}
      </div>
    </div>
  );
}
