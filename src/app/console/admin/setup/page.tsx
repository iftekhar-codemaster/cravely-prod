"use client";

import { useEffect, useMemo, useState } from "react";
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
  markPasswordRotated,
  missingRequirements,
  passwordScore,
} from "@/lib/adminSecurity";

type Step = "passkey" | "password" | "ip" | "advisor" | "done";

export default function AdminSetupPage() {
  const { user, profile, loading } = useAuth();
  const [step, setStep] = useState<Step>("passkey");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // super admin rotation
  const [current, setCurrent] = useState("admin123");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  // admin advisor
  const [advCurrent, setAdvCurrent] = useState("");
  const [advNext, setAdvNext] = useState("");
  const strength = useMemo(() => passwordScore(advNext), [advNext]);
  const [skippedAdvisor, setSkippedAdvisor] = useState(false);

  // ip step
  const [ip, setIp] = useState("");

  useEffect(() => {
    if (loading || !user || !profile) return;
    void getAdminSecurity(user.uid).then((s) => {
      if (!user || !profile) return;
      const role = profile.role === "super_admin" ? "super_admin" : "admin";
      const missing = missingRequirements(s, role);
      if (missing.length === 0) {
        setStep("done");
        return;
      }
      setStep(missing.includes("passkey") ? "passkey" : missing.includes("password") ? "password" : "ip");
    });
  }, [loading, user, profile]);

  async function doPasskey() {
    setError(null);
    setBusy(true);
    try {
      await enrollPasskey(user!.uid, user!.email!);
      const s = await getAdminSecurity(user!.uid);
      const role = profile?.role === "super_admin" ? "super_admin" : "admin";
      const missing = missingRequirements(s, role);
      if (role === "super_admin") {
        setStep(missing.includes("password") ? "password" : "ip");
      } else {
        setStep("advisor"); // recommended, skippable
      }
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
      setStep("ip");
    } catch {
      setError("Current password is incorrect.");
    } finally {
      setBusy(false);
    }
  }

  async function advisorRotate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (strength.score < 3)
      return setError("Pick something Strong or better — or skip for now.");
    setBusy(true);
    try {
      const cred = EmailAuthProvider.credential(user!.email!, advCurrent);
      await reauthenticateWithCredential(user!, cred);
      await updatePassword(user!, advNext);
      await markPasswordRotated(user!.uid);
      setStep("done");
    } catch {
      setError("Current password is incorrect.");
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
      if (!/^[0-9a-fA-F.:*]+$/.test(target)) throw new Error("bad ip");
      await addAllowedIp(user!.uid, target);
      setStep("done");
    } catch {
      setError("Enter a valid IP address (or leave empty to allow your current IP).");
    } finally {
      setBusy(false);
    }
  }

  const steps: { key: Step; label: string }[] =
    profile?.role === "super_admin"
      ? [
          { key: "passkey", label: "Passkey" },
          { key: "password", label: "Password" },
          { key: "ip", label: "Allow IPs" },
        ]
      : [
          { key: "passkey", label: "Passkey" },
          { key: "advisor", label: "Password check" },
        ];
  const idx = steps.findIndex((s) => s.key === step);

  if (step === "done") {
    return (
      <div className="text-center pt-10 anim-fade-up">
        <div className="mx-auto w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-3xl mb-4">
          <i className="fa-solid fa-check" aria-hidden />
        </div>
        <h1 className="text-xl font-extrabold mb-1">You&apos;re all set!</h1>
        <p className="text-sm text-text-light mb-6 max-w-xs mx-auto">
          {profile?.role === "super_admin"
            ? "Your account is secured with a rotated password, a passkey and an IP allowlist."
            : "Your passkey is enrolled. You can strengthen your password anytime from Security."}
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
      <ol className="flex items-start gap-2 mb-8 mt-4">
        {steps.map((s, i) => (
          <li key={s.key} className="flex-1">
            <div
              className={`h-1.5 rounded-full ${
                i < idx
                  ? "bg-green-500"
                  : i === idx
                    ? "bg-primary"
                    : "bg-gray-200"
              }`}
            />
            <span
              className={`block mt-2 text-[11px] font-semibold ${
                i <= idx ? (s.key === "advisor" && !skippedAdvisor ? "text-text-light" : "text-primary") : "text-text-light"
              }`}
            >
              {i + 1}. {s.label}
              {s.key === "advisor" && (
                <span className="ml-1 normal-case font-normal text-[10px]">(optional)</span>
              )}
            </span>
          </li>
        ))}
      </ol>

      <h1 className="text-xl font-extrabold mb-1">Admin security setup</h1>
      <p className="text-sm text-text-light mb-6">
        {profile?.role === "super_admin"
          ? "Secure your Super Admin account before continuing."
          : "One quick step to protect your admin access."}
      </p>

      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-primary">{error}</p>
      )}

      {step === "passkey" && (
        <div className="space-y-5 anim-fade-up">
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
            className="w-full bg-primary text-white py-3 rounded-full font-semibold disabled:opacity-50 pressable"
          >
            {busy ? "Waiting for authenticator…" : "Create passkey"}
          </button>
        </div>
      )}

      {step === "password" && (
        <form onSubmit={rotatePassword} className="space-y-4 anim-fade-up">
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
            <i className="fa-solid fa-triangle-exclamation mr-1.5" aria-hidden />
            The initial password <b>admin123</b> must be replaced now.
          </div>
          <input type="password" placeholder="Initial password" value={current} onChange={(e) => setCurrent(e.target.value)} required className="w-full rounded-xl border border-line bg-card px-4 py-3 text-sm outline-none focus:border-primary" />
          <input type="password" placeholder="New password (min 8 chars)" value={next} onChange={(e) => setNext(e.target.value)} required minLength={8} className="w-full rounded-xl border border-line bg-card px-4 py-3 text-sm outline-none focus:border-primary" />
          <input type="password" placeholder="Repeat new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} className="w-full rounded-xl border border-line bg-card px-4 py-3 text-sm outline-none focus:border-primary" />
          <button disabled={busy} className="w-full bg-primary text-white py-3 rounded-full font-semibold disabled:opacity-50 pressable">
            {busy ? "Saving…" : "Update password"}
          </button>
        </form>
      )}

      {step === "advisor" && (
        <div className="space-y-5 anim-fade-up">
          {!skippedAdvisor ? (
            <>
              <div className="rounded-xl border border-line bg-card p-5">
                <div className="flex items-center gap-2 mb-2">
                  <i className="fa-solid fa-shield-heart text-primary" aria-hidden />
                  <span className="font-bold text-sm">Do you believe you have a strong password?</span>
                </div>
                <p className="text-xs text-text-light leading-relaxed">
                  Recommended, not forced — admins can sign in with passkeys alone.
                  If your password is reused or guessable, upgrade it now.
                </p>
              </div>
              <form onSubmit={advisorRotate} className="space-y-3">
                <input type="password" placeholder="Current password" value={advCurrent} onChange={(e) => setAdvCurrent(e.target.value)} required className="w-full rounded-xl border border-line bg-card px-4 py-3 text-sm outline-none focus:border-primary" />
                <input type="password" placeholder="New password" value={advNext} onChange={(e) => setAdvNext(e.target.value)} required className="w-full rounded-xl border border-line bg-card px-4 py-3 text-sm outline-none focus:border-primary" />
                {advNext && (
                  <div>
                    <div className="flex gap-1">
                      {[0, 1, 2, 3].map((i) => (
                        <div key={i} className={`h-1.5 flex-1 rounded-full ${i < Math.max(strength.score, 0) ? (strength.score <= 1 ? "bg-red-400" : strength.score === 2 ? "bg-amber-400" : "bg-green-500") : "bg-gray-200"}`} />
                      ))}
                    </div>
                    <p className="text-[11px] mt-1 text-text-light">
                      {strength.label}
                      {strength.tips.length > 0 && ` · ${strength.tips[0]}`}
                    </p>
                  </div>
                )}
                <button disabled={busy} className="w-full bg-primary text-white py-3 rounded-full font-semibold disabled:opacity-50 pressable">
                  {busy ? "Saving…" : "Upgrade password"}
                </button>
              </form>
              <button
                onClick={() => {
                  setSkippedAdvisor(true);
                  setStep("done");
                }}
                className="w-full text-center text-xs text-text-light hover:text-primary transition-colors"
              >
                Skip for now →
              </button>
            </>
          ) : null}
        </div>
      )}

      {step === "ip" && (
        <form onSubmit={allowIp} className="space-y-4 anim-fade-up">
          <div className="rounded-xl border border-line bg-card p-5">
            <i className="fa-solid fa-network-wired text-2xl text-primary mb-2" aria-hidden />
            <p className="text-sm text-text-light leading-relaxed">
              Add the IP addresses you will administer from. Leave empty to allow
              your <b>current IP</b>. Wildcards like <code>103.21.58.*</code> are
              supported.
            </p>
          </div>
          <input
            type="text"
            placeholder="Your current IP (auto-detected)"
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            className="w-full rounded-xl border border-line bg-card px-4 py-3 text-sm outline-none focus:border-primary font-mono"
          />
          <button disabled={busy} className="w-full bg-primary text-white py-3 rounded-full font-semibold disabled:opacity-50 pressable">
            {busy ? "Checking…" : "Allow this IP & finish"}
          </button>
        </form>
      )}
    </div>
  );
}
