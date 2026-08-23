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
 * Returns true when an enrolled credential was used.
 */
export async function verifyPasskey(uid: string): Promise<boolean> {
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
