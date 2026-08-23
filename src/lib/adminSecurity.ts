"use client";

import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { getDb } from "./firebase";

export type PasskeyRecord = {
  id: string; // base64url credential id
  label: string;
  createdAt: number;
};

export type AdminSecurity = {
  passkeys: PasskeyRecord[];
  allowedIps: string[];
  passwordRotated: boolean;
};

const EMPTY: AdminSecurity = { passkeys: [], allowedIps: [], passwordRotated: false };

export async function getAdminSecurity(uid: string): Promise<AdminSecurity> {
  const db = getDb();
  if (!db) return EMPTY;
  const snap = await getDoc(doc(db, "adminSecurity", uid));
  if (!snap.exists()) return EMPTY;
  const d = snap.data();
  return {
    passkeys: (d.passkeys as PasskeyRecord[]) ?? [],
    allowedIps: (d.allowedIps as string[]) ?? [],
    passwordRotated: Boolean(d.passwordRotated),
  };
}

export function isSetupComplete(s: AdminSecurity): boolean {
  return s.passwordRotated && s.passkeys.length > 0 && s.allowedIps.length > 0;
}

/** Admins need a passkey; super admins additionally need rotated password + IPs. */
export function missingRequirements(
  s: AdminSecurity,
  role: "admin" | "super_admin",
): string[] {
  const missing: string[] = [];
  if (s.passkeys.length === 0) missing.push("passkey");
  if (role === "super_admin") {
    if (!s.passwordRotated) missing.push("password");
    if (s.allowedIps.length === 0) missing.push("ip");
  }
  return missing;
}

/**
 * Heuristic password strength 0–4. Not zxcvbn, but catches the classics:
 * short, common, repetitive, low variety.
 */
export function passwordScore(pw: string): {
  score: number;
  label: string;
  tips: string[];
} {
  if (!pw) return { score: 0, label: "Empty", tips: [] };
  const tips: string[] = [];
  let score = 0;
  const variety =
    (/[a-z]/.test(pw) ? 1 : 0) +
    (/[A-Z]/.test(pw) ? 1 : 0) +
    (/[0-9]/.test(pw) ? 1 : 0) +
    (/[^a-zA-Z0-9]/.test(pw) ? 1 : 0);

  if (pw.length >= 12) score++;
  else if (pw.length >= 8) score += 0.5;
  else tips.push("Use at least 12 characters");

  if (variety >= 3) score++;
  else tips.push("Mix upper, lower, numbers & symbols");

  if (!/(.)\1{2,}|1234|abcd|password|admin|qwerty|cravely/i.test(pw)) score++;
  else tips.push("Avoid repeated keys or common words");

  if (pw.length >= 16 && variety === 4) score++;

  const labels = ["Very weak", "Weak", "Fair", "Strong", "Excellent"];
  return {
    score: Math.min(4, Math.round(score)),
    label: labels[Math.min(4, Math.round(score))],
    tips,
  };
}

// ---------- WebAuthn helpers ----------

function toBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (const c of b) s += String.fromCharCode(c);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): Uint8Array {
  const pad = "===".slice((s.length + 3) % 4);
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

/** Registers a passkey for the given user and stores its credential id in Firestore. */
export async function enrollPasskey(uid: string, email: string): Promise<PasskeyRecord> {
  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: { name: "Cravely Console", id: window.location.hostname },
      user: {
        id: new TextEncoder().encode(uid),
        name: email,
        displayName: email,
      },
      pubKeyCredParams: [
        { alg: -7, type: "public-key" },
        { alg: -257, type: "public-key" },
      ],
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "required",
      },
      timeout: 60000,
      attestation: "none",
    },
  })) as PublicKeyCredential | null;
  if (!cred) throw new Error("Passkey creation was cancelled.");
  const record: PasskeyRecord = {
    id: toBase64Url(cred.rawId),
    label: `Passkey · ${new Date().toLocaleDateString()}`,
    createdAt: Date.now(),
  };
  const db = getDb()!;
  await setDoc(
    doc(db, "adminSecurity", uid),
    { passkeys: arrayUnion(record) },
    { merge: true },
  );
  return record;
}

/**
 * Verifies the user holds one of their enrolled passkeys.
 * Never throws — returns false on any failure (wrong domain, cancel, no key).
 */
export async function verifyPasskey(uid: string): Promise<boolean> {
  try {
    const security = await getAdminSecurity(uid);
    if (security.passkeys.length === 0) return false;
    const assertion = (await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        allowCredentials: security.passkeys.map((p) => ({
          id: fromBase64Url(p.id) as unknown as BufferSource,
          type: "public-key",
        })),
        userVerification: "required",
        timeout: 60000,
      },
    })) as PublicKeyCredential | null;
    if (!assertion) return false;
    const used = toBase64Url(assertion.rawId);
    return security.passkeys.some((p) => p.id === used);
  } catch (err) {
    // NotAllowedError (no credential for this RP/domain), cancel, timeout…
    console.warn("[cravely] passkey verify failed:", err);
    return false;
  }
}

export async function removePasskey(uid: string, passkeyId: string): Promise<void> {
  const db = getDb()!;
  const security = await getAdminSecurity(uid);
  const target = security.passkeys.find((p) => p.id === passkeyId);
  if (!target) return;
  await updateDoc(doc(db, "adminSecurity", uid), {
    passkeys: arrayRemove(target),
  });
}

/** Emergency: clear all passkeys (e.g. after moving to a new domain). Requires password re-auth by caller. */
export async function resetPasskeys(uid: string): Promise<void> {
  const db = getDb()!;
  await updateDoc(doc(db, "adminSecurity", uid), { passkeys: [] });
}

// ---------- IP allowlist ----------

export async function addAllowedIp(uid: string, ip: string): Promise<void> {
  const db = getDb()!;
  await setDoc(
    doc(db, "adminSecurity", uid),
    { allowedIps: arrayUnion(ip.trim()) },
    { merge: true },
  );
}

export async function removeAllowedIp(uid: string, ip: string): Promise<void> {
  const db = getDb()!;
  await updateDoc(doc(db, "adminSecurity", uid), {
    allowedIps: arrayRemove(ip.trim()),
  });
}

export async function markPasswordRotated(uid: string): Promise<void> {
  const db = getDb()!;
  await setDoc(doc(db, "adminSecurity", uid), { passwordRotated: true }, { merge: true });
}

export function ipMatchesAllowed(ip: string, allowed: string[]): boolean {
  if (allowed.length === 0) return false;
  const normalized = ip.replace(/^::ffff:/, "");
  if (allowed.includes(normalized)) return true;
  // loopback / link-local are treated as trusted dev access
  const loopbacks = ["127.0.0.1", "::1", "localhost"];
  if (loopbacks.includes(normalized)) return true;
  // simple /24 wildcard support: "103.21.58.*"
  return allowed.some((a) =>
    a.endsWith(".*") ? normalized.startsWith(a.slice(0, -1)) : a === normalized,
  );
}
