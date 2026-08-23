"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { applyActionCode, getAuth } from "firebase/auth";

function VerifyEmailInner() {
  const params = useSearchParams();
  const oobCode = params.get("oobCode");
  const [state, setState] = useState<"verifying" | "ok" | "error">("verifying");

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!oobCode) {
        setState("error");
        return;
      }
      try {
        await applyActionCode(getAuth(), oobCode);
        setState("ok");
      } catch {
        setState("error");
      }
    }, 0);
    return () => clearTimeout(t);
  }, [oobCode]);

  return (
    <div className="px-6 pt-16 pb-10 text-center">
      {state === "verifying" && (
        <>
          <i className="fa-solid fa-spinner fa-spin text-4xl text-primary" aria-hidden />
          <h1 className="text-xl font-extrabold mt-5">Verifying your email…</h1>
        </>
      )}
      {state === "ok" && (
        <div className="anim-fade-up">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-green-100 text-green-600 flex items-center justify-center text-3xl">
            <i className="fa-solid fa-check" aria-hidden />
          </div>
          <h1 className="text-xl font-extrabold mt-5">Email verified!</h1>
          <p className="text-sm text-text-light mt-2">
            Your account is fully activated. Enjoy Cravely.
          </p>
          <Link
            href="/profile"
            className="inline-block mt-6 bg-primary text-white px-8 py-3 rounded-full font-semibold pressable"
          >
            Go to profile
          </Link>
        </div>
      )}
      {state === "error" && (
        <div className="anim-fade-up">
          <i className="fa-solid fa-circle-exclamation text-4xl text-amber-500" aria-hidden />
          <h1 className="text-xl font-extrabold mt-5">Link invalid or expired</h1>
          <p className="text-sm text-text-light mt-2 max-w-xs mx-auto leading-relaxed">
            Verification links only work once. Request a fresh one from your
            profile page.
          </p>
          <Link
            href="/profile"
            className="inline-block mt-6 border border-primary text-primary px-8 py-3 rounded-full font-semibold"
          >
            Back to profile
          </Link>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="px-6 pt-16 text-center">
          <i className="fa-solid fa-spinner fa-spin text-4xl text-primary" aria-hidden />
        </div>
      }
    >
      <VerifyEmailInner />
    </Suspense>
  );
}
