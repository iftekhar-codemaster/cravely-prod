"use client";

import { useState } from "react";
import Link from "next/link";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { useAuth } from "@/components/AuthProvider";
import {
  addAllowedIp,
  enrollPasskey,
  getAdminSecurity,
  isSetupComplete,
  markPasswordRotated,
} from "@/lib/adminSecurity";

type Step = "password" | "passkey" | "ip" | "done";

export default function AdminSetupPage() {
  const { user, profile } = useAuth();
  const [step, setStep] = useState<Step>("password");
  const [current, setCurrent] = useState("admin123");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ip, setIp] = useState("");

  async function rotatePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (next.length < 8) return setError("New password must be at least 8 characters.");
    if (next !== confirm) return setError("Passwords do not match.");
    if (next === current) return setError("Choose a password different from the initial one.");
    setBusy(true);
    try {
      const cred = EmailAuthProvider.credential(user!.email!, current);
      await reauthenticateWithCredential(user!, cred);
      await updatePassword(user!, next);
      await markPasswordRotated(user!.uid);
      setStep("passkey");
    } catch {
      setError("Current password is incorrect.");
    } finally {
      setBusy(false);
    }
  }

  async function doPasskey() {
    setError(null);
    setBusy(true);
    try {
      await enrollPasskey(user!.uid, user!.email!);
      setStep("ip");
    } catch (err) {
      setError(
        err instanceof Error && /cancel/i.test(err.message)
          ? "Passkey enrollment was cancelled."
          : "Could not create a passkey on this device. Use a browser with passkey support (Chrome, Safari, Edge).",
      );
    } finally {
      setBusy(false);
    }
  }

  async function allowIp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      let target = ip.trim();
      if (!target) {
        const res = await fetch("/api/my-ip", { cache: "no-store" });
        target = ((await res.json()) as { ip: string }).ip;
      }
      if (!/^[0-9a-fA-F.:*]+$/.test(target)) {
        throw new Error("invalid");
      }
      await addAllowedIp(user!.uid, target);
      await markPasswordRotated(user!.uid); // no-op merge, keeps doc complete
      const security = await getAdminSecurity(user!.uid);
      if (isSetupComplete(security)) {
        sessionStorage.setItem("cravely:passkey-ok", user!.uid);
        setStep("done");
      }
    } catch {
      setError("Enter a valid IP address (or leave empty to allow your current IP).");
    } finally {
      setBusy(false);
    }
  }

  const steps: { key: Step; label: string }[] = [
    { key: "password", label: "Rotate password" },
    { key: "passkey", label: "Enroll passkey" },
    { key: "ip", label: "Allow IPs" },
  ];
  const idx = steps.findIndex((s) => s.key === step);

  if (step === "done") {
    return (
      <div className="text-center pt-10">
        <div className="mx-auto w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-3xl mb-4">
          <i className="fa-solid fa-check" aria-hidden />
        </div>
        <h1 className="text-xl font-extrabold mb-1">You&apos;re all set!</h1>
        <p className="text-sm text-text-light mb-6 max-w-xs mx-auto">
          Your admin account is secured with a rotated password, a passkey and an
          IP allowlist.
        </p>
        <Link
          href="/console/admin"
          className="inline-block bg-primary text-white px-8 py-3 rounded-full font-semibold"
        >
          Enter console
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      {/* Progress */}
      <ol className="flex items-center gap-2 mb-8">
        {steps.map((s, i) => (
          <li key={s.key} className="flex-1">
            <div
              className={`h-1.5 rounded-full ${i <= idx ? "bg-primary" : "bg-gray-200"}`}
            />
            <span
              className={`block mt-2 text-[11px] font-semibold ${
                i <= idx ? "text-primary" : "text-text-light"
              }`}
            >
              {i + 1}. {s.label}
            </span>
          </li>
        ))}
      </ol>

      <h1 className="text-xl font-extrabold mb-1">Admin security setup</h1>
      <p className="text-sm text-text-light mb-6">
        Hi {profile?.displayName ?? user?.email} — secure your Super Admin
        account before continuing.
      </p>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-primary">
          {error}
        </p>
      )}

      {step === "password" && (
        <form onSubmit={rotatePassword} className="space-y-4">
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
            <i className="fa-solid fa-triangle-exclamation mr-1.5" aria-hidden />
            The initial password <b>admin123</b> must be replaced now.
          </div>
          <input
            type="password"
            placeholder="Initial password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
            className="w-full rounded-xl border border-line bg-card px-4 py-3 text-sm outline-none focus:border-primary"
          />
          <input
            type="password"
            placeholder="New password (min 8 chars)"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            required
            minLength={8}
            className="w-full rounded-xl border border-line bg-card px-4 py-3 text-sm outline-none focus:border-primary"
          />
          <input
            type="password"
            placeholder="Repeat new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={8}
            className="w-full rounded-xl border border-line bg-card px-4 py-3 text-sm outline-none focus:border-primary"
          />
          <button
            disabled={busy}
            className="w-full bg-primary text-white py-3 rounded-full font-semibold disabled:opacity-50"
          >
            {busy ? "Saving…" : "Update password"}
          </button>
        </form>
      )}

      {step === "passkey" && (
        <div className="space-y-5">
          <div className="rounded-xl border border-line bg-card p-5 text-center">
            <i className="fa-solid fa-fingerprint text-4xl text-primary mb-3" aria-hidden />
            <p className="text-sm text-text-light leading-relaxed">
              Enroll a <b>passkey</b> (fingerprint, face or device PIN). Every
              console session will require it — even if your password leaks.
            </p>
          </div>
          <button
            onClick={() => void doPasskey()}
            disabled={busy}
            className="w-full bg-primary text-white py-3 rounded-full font-semibold disabled:opacity-50"
          >
            {busy ? "Waiting for authenticator…" : "Create passkey"}
          </button>
        </div>
      )}

      {step === "ip" && (
        <form onSubmit={allowIp} className="space-y-4">
          <div className="rounded-xl border border-line bg-card p-5">
            <i className="fa-solid fa-network-wired text-2xl text-primary mb-2" aria-hidden />
            <p className="text-sm text-text-light leading-relaxed">
              Add the IP addresses you will administer from. Leave the field
              empty to allow your <b>current IP</b>. Wildcards like{" "}
              <code>103.21.58.*</code> are supported.
            </p>
          </div>
          <input
            type="text"
            placeholder="Your current IP (auto-detected)"
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            className="w-full rounded-xl border border-line bg-card px-4 py-3 text-sm outline-none focus:border-primary font-mono"
          />
          <button
            disabled={busy}
            className="w-full bg-primary text-white py-3 rounded-full font-semibold disabled:opacity-50"
          >
            {busy ? "Checking…" : "Allow this IP & finish"}
          </button>
        </form>
      )}
    </div>
  );
}
