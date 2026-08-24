"use client";

import { useCallback, useEffect, useState } from "react";
import {
  GoogleAuthProvider,
  reauthenticateWithPopup,
  updatePassword,
} from "firebase/auth";
import { useAuth } from "@/components/AuthProvider";
import { getFirebaseAuth } from "@/lib/firebase";
import { audit } from "@/lib/audit";
import {
  addAllowedIp,
  getAdminSecurity,
  getSystemSettings,
  ipMatchesAllowed,
  removeAllowedIp,
  removePasskey,
  setIpAllowlistEnabled,
  setPasskeyRecovery,
  verifyPasskey,
  type AdminSecurity,
  type SystemSettings,
} from "@/lib/adminSecurity";

export default function AdminSecurityPage() {
  const { user, profile } = useAuth();
  const [security, setSecurity] = useState<AdminSecurity | null>(null);
  const [sys, setSys] = useState<SystemSettings>({ passkeyRecovery: true, ipAllowlistEnabled: true });
  const [myIp, setMyIp] = useState("");
  const [newIp, setNewIp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // ---- Password change: passkey-gated, no old password ----
  const [pwVerified, setPwVerified] = useState(false);
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwErr, setPwErr] = useState<string | null>(null);


  const load = useCallback(async () => {
    if (!user) return;
    setSecurity(await getAdminSecurity(user.uid));
    setSys(await getSystemSettings());
  }, [user]);

  useEffect(() => {
    const t = setTimeout(() => {
      void load();
      fetch("/api/my-ip", { cache: "no-store" })
        .then((r) => r.json())
        .then((d: { ip: string }) => setMyIp(d.ip))
        .catch(() => setMyIp("unknown"));
    }, 0);
    return () => clearTimeout(t);
  }, [load]);


  async function run(fn: () => Promise<void>) {
    setError(null);
    setBusy(true);
    try {
      await fn();
      await load();
    } catch (err) {
      console.warn(err);
      setError("Action failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!security || !user) {
    return (
      <div className="space-y-3">
        {[0, 1].map((i) => (
          <div key={i} className="h-28 rounded-xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  const ipOk = ipMatchesAllowed(myIp, security.allowedIps);

  async function toggleRecovery(enabled: boolean) {
    setError(null);
    setBusy(true);
    try {
      await setPasskeyRecovery(enabled);
      setSys((s) => ({ ...s, passkeyRecovery: enabled }));
    } catch {
      setError("Could not update setting — super admin only.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyWithPasskey() {
    if (!user) return;
    setPwErr(null);
    setPwBusy(true);
    try {
      setPwVerified(await verifyPasskey(user.uid));
      if (!setPwVerified) setPwErr("Passkey verification failed.");
    } finally {
      setPwBusy(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    const auth = getFirebaseAuth();
    if (!auth?.currentUser) return;
    setPwErr(null);
    setPwMsg(null);
    if (pwNew.length < 8) return setPwErr("Password must be at least 8 characters.");
    if (pwNew !== pwConfirm) return setPwErr("Passwords do not match.");
    setPwBusy(true);
    try {
      await updatePassword(auth.currentUser, pwNew);
      setPwMsg("Password updated.");
      setPwNew("");
      setPwConfirm("");
      setPwVerified(false);
      void audit("security.password.change", user!.uid);
    } catch (err) {
      const code = (err as { code?: string }).code ?? "";
      if (code === "auth/requires-recent-login") {
        // Try silent re-auth via Google popup (works when Google is linked)
        try {
          await reauthenticateWithPopup(auth.currentUser, new GoogleAuthProvider());
          await updatePassword(auth.currentUser, pwNew);
          setPwMsg("Password updated (re-verified via Google).");
          setPwNew("");
          setPwConfirm("");
          setPwVerified(false);
          void audit("security.password.change", user!.uid, { reauth: "google" });
        } catch (err2) {
          const code2 = (err2 as { code?: string }).code ?? "";
          setPwErr(
            code2 === "auth/popup-closed-by-user"
              ? "Session too old — complete the Google popup to confirm it's you."
              : code2 === "auth/no-such-provider" || code2 === "auth/user-mismatch"
                ? "Session too old. Sign out, sign in, then change the password."
                : "Could not update password. Try again.",
          );
        }
      } else {
        setPwErr("Could not update password. Try again.");
      }
    } finally {
      setPwBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold mb-1">Security</h1>
        <p className="text-sm text-text-light">
          These protections apply to admin accounts only — never to users or
          restaurants.
        </p>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-primary">{error}</p>
      )}

      {/* Status */}
      <section className="grid grid-cols-3 gap-3 text-center">
        {[
          {
            label: "Password rotated",
            ok: security.passwordRotated,
            icon: "fa-key",
          },
          { label: "Passkey enrolled", ok: security.passkeys.length > 0, icon: "fa-fingerprint" },
          { label: "IP allowlist set", ok: security.allowedIps.length > 0, icon: "fa-network-wired" },
        ].map((s) => (
          <div
            key={s.label}
            className={`rounded-xl border p-3 ${
              s.ok ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"
            }`}
          >
            <i
              className={`fa-solid ${s.ok ? "fa-circle-check text-green-600" : "fa-circle-exclamation text-amber-500"}`}
              aria-hidden
            />
            <p className="text-[11px] font-semibold mt-1 leading-tight">{s.label}</p>
          </div>
        ))}
      </section>

      {/* Passkeys */}
      <section className="rounded-xl border border-line bg-card p-4 shadow-card">
        <h2 className="font-bold text-sm mb-3">
          <i className="fa-solid fa-fingerprint text-primary mr-2" aria-hidden />
          Passkeys ({security.passkeys.length})
        </h2>
        <div className="space-y-2">
          {security.passkeys.map((p) => (
            <div key={p.id} className="flex items-center gap-2 text-sm">
              <i className="fa-solid fa-mobile-screen text-text-light" aria-hidden />
              <span className="flex-1 truncate">{p.label}</span>
              <button
                disabled={busy}
                onClick={() =>
                  void run(() => removePasskey(user.uid, p.id))
                }
                aria-label={`Remove ${p.label}`}
                className="text-text-light hover:text-primary"
              >
                <i className="fa-solid fa-trash text-xs" aria-hidden />
              </button>
            </div>
          ))}
          {security.passkeys.length === 0 && (
            <p className="text-xs text-text-light">No passkeys enrolled.</p>
          )}
        </div>
        <button
          disabled={busy}
          onClick={() =>
            void run(async () => {
              await import("@/lib/adminSecurity").then((m) =>
                m.enrollPasskey(user!.uid, user!.email!),
              );
            })
          }
          className="mt-4 w-full border border-primary text-primary font-semibold text-xs py-2.5 rounded-full hover:bg-primary hover:text-white transition-colors"
        >
          + Add another passkey
        </button>
      </section>

      {/* IPs */}
      <section className="rounded-xl border border-line bg-card p-4 shadow-card">
        <h2 className="font-bold text-sm mb-1">
          <i className="fa-solid fa-network-wired text-primary mr-2" aria-hidden />
          Allowed IPs
        </h2>
        <p className="text-[11px] text-text-light mb-3">
          Your current IP: <b className="font-mono">{myIp}</b>{" "}
          {ipOk ? (
            <span className="text-green-600 font-semibold">(allowed)</span>
          ) : (
            <span className="text-red-500 font-semibold">(blocked)</span>
          )}
        </p>
        <div className="space-y-2 mb-3">
          {security.allowedIps.map((entry) => (
            <div
              key={entry}
              className="flex items-center gap-2 bg-background rounded-lg px-3 py-2"
            >
              <code className="text-xs flex-1">{entry}</code>
              {entry === myIp && (
                <span className="text-[10px] text-green-600 font-bold">YOU</span>
              )}
              <button
                disabled={busy}
                onClick={() => void run(() => removeAllowedIp(user.uid, entry))}
                aria-label={`Remove ${entry}`}
                className="text-text-light hover:text-primary"
              >
                <i className="fa-solid fa-xmark text-xs" aria-hidden />
              </button>
            </div>
          ))}
          {security.allowedIps.length === 0 && (
            <p className="text-xs text-text-light">Allowlist is empty.</p>
          )}
        </div>
        <div className="flex gap-2">
          <input
            value={newIp}
            onChange={(e) => setNewIp(e.target.value)}
            placeholder="e.g. 103.21.58.9 or 103.21.58.*"
            className="flex-1 min-w-0 rounded-lg border border-line bg-background px-3 py-2 text-xs font-mono outline-none focus:border-primary"
          />
          <button
            disabled={busy || !newIp.trim()}
            onClick={() =>
              void run(async () => {
                await addAllowedIp(user.uid, newIp);
                setNewIp("");
              })
            }
            className="bg-primary text-white text-xs font-bold px-4 rounded-lg disabled:opacity-40"
          >
            Add
          </button>
        </div>
      </section>

      {/* Password change — passkey-gated, no old password */}
      <section className="rounded-xl border border-line bg-card p-4 shadow-card">
        <h2 className="font-bold text-sm mb-1">
          <i className="fa-solid fa-key text-primary mr-2" aria-hidden />
          Change password
        </h2>
        <p className="text-[11px] text-text-light mb-3">
          Verified with your passkey — your current password is never asked.
        </p>

        {!pwVerified ? (
          <button
            onClick={() => void verifyWithPasskey()}
            disabled={pwBusy}
            className="w-full bg-primary text-white rounded-full py-2.5 font-semibold text-xs disabled:opacity-50 pressable"
          >
            <i className="fa-solid fa-fingerprint mr-2" aria-hidden />
            {pwBusy ? "Waiting for passkey…" : "Verify with passkey to continue"}
          </button>
        ) : (
          <form onSubmit={changePassword} className="space-y-3 anim-fade-up">
            <input
              type="password"
              placeholder="New password (min 8 chars)"
              value={pwNew}
              onChange={(e) => setPwNew(e.target.value)}
              required
              minLength={8}
              className="w-full rounded-xl border border-line bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
            />
            <input
              type="password"
              placeholder="Repeat new password"
              value={pwConfirm}
              onChange={(e) => setPwConfirm(e.target.value)}
              required
              minLength={8}
              className="w-full rounded-xl border border-line bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
            />
            <button
              disabled={pwBusy}
              className="w-full bg-primary text-white rounded-full py-2.5 font-semibold text-xs disabled:opacity-50 pressable"
            >
              {pwBusy ? "Updating…" : "Update password"}
            </button>
          </form>
        )}
        {pwErr && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-primary">{pwErr}</p>
        )}
        {pwMsg && (
          <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700">{pwMsg}</p>
        )}
      </section>

      {/* Global settings — super admin */}
      {profile?.role === "super_admin" && (
        <section className="rounded-xl border border-line bg-card p-4 shadow-card">
          <h2 className="font-bold text-sm mb-1">
            <i className="fa-solid fa-globe text-primary mr-2" aria-hidden />
            Global settings
          </h2>
          <label className="flex items-center gap-3 rounded-xl border border-line px-4 py-3 mt-3 cursor-pointer pressable">
            <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
              <i className="fa-solid fa-key" aria-hidden />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-semibold">
                Password recovery on passkey failure
              </span>
              <span className="block text-[11px] text-text-light leading-snug">
                When a passkey can&apos;t verify (new domain, lost key), admins may
                reset it with their password. Disable to force passkey-only access.
              </span>
            </span>
            <input
              type="checkbox"
              checked={sys.passkeyRecovery}
              onChange={(e) => void toggleRecovery(e.target.checked)}
              disabled={busy}
              className="accent-primary w-4 h-4 flex-shrink-0"
            />
          </label>

          <label className="flex items-center gap-3 rounded-xl border border-line px-4 py-3 mt-2 cursor-pointer pressable">
            <span className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${sys.ipAllowlistEnabled ? "bg-primary/10 text-primary" : "bg-gray-100 text-text-light"}`}>
              <i className="fa-solid fa-network-wired" aria-hidden />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-semibold">
                IP allowlist enforcement
              </span>
              <span className="block text-[11px] text-text-light leading-snug">
                {sys.ipAllowlistEnabled
                  ? "ON — console only opens from allowed IPs. Turn OFF if your network rotates IPs (e.g. behind Cloudflare)."
                  : "OFF — any IP can open the console (passkey still required)."}
              </span>
            </span>
            <input
              type="checkbox"
              checked={sys.ipAllowlistEnabled}
              onChange={(e) => void run(() => setIpAllowlistEnabled(e.target.checked))}
              disabled={busy}
              className="accent-primary w-4 h-4 flex-shrink-0"
            />
          </label>
        </section>
      )}
    </div>
  );
}
