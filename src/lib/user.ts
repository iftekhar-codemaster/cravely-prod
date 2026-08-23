import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getDb } from "./firebase";

export type Role = "user" | "restaurant" | "admin" | "super_admin";

export const OWNER_EMAIL =
  process.env.NEXT_PUBLIC_OWNER_EMAIL ?? "itx.iftekhars@gmail.com";

export const ROLE_LABELS: Record<Role, string> = {
  user: "User",
  restaurant: "Restaurant",
  admin: "Admin",
  super_admin: "Super Admin",
};

export type UserProfile = {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: Role;
  restaurantId?: string;
  perms?: string[];
  createdAt?: unknown;
};

export function isAdminRole(role?: Role): boolean {
  return role === "admin" || role === "super_admin";
}

/**
 * Ensures a users/{uid} profile doc exists for the given auth identity.
 * The owner email is always forced to super_admin; everyone else defaults
 * to the `user` role (never overwrites an existing role).
 */
export async function ensureUserProfile(u: {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}): Promise<UserProfile> {
  const db = getDb();
  if (!db) throw new Error("Firebase is not configured.");
  const ref = doc(db, "users", u.uid);
  const snap = await getDoc(ref);
  const email = u.email ?? "";
  const role: Role = email.toLowerCase() === OWNER_EMAIL.toLowerCase() ? "super_admin" : "user";

  if (!snap.exists()) {
    const profile: UserProfile = {
      uid: u.uid,
      email,
      displayName: u.displayName ?? email.split("@")[0] ?? "User",
      photoURL: u.photoURL ?? "",
      role,
    };
    await setDoc(ref, { ...profile, createdAt: serverTimestamp() });
    return profile;
  }

  const data = snap.data() as UserProfile;
  // Owner escalation is automatic and non-revocable from the client.
  if (email.toLowerCase() === OWNER_EMAIL.toLowerCase() && data.role !== "super_admin") {
    await setDoc(ref, { role: "super_admin" }, { merge: true });
    return { ...data, uid: u.uid, role: "super_admin" };
  }
  return { ...data, uid: u.uid };
}
