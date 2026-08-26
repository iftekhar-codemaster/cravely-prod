"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";

const ASKED_KEY = "cravely:permsAsked";

type Step = "ask" | "location" | "notifications" | "confirm" | "done" | null;

/** One-time friendly permission ask for new signed-in users. */
export default function PermissionPrompts() {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>(null);
  const [wantLocation, setWantLocation] = useState(true);
  const [wantNotifications, setWantNotifications] = useState(true);

  useEffect(() => {
    if (!user) return;
    const t = setTimeout(() => {
      if (!localStorage.getItem(ASKED_KEY)) setStep("ask");
    }, 1500);
    return () => clearTimeout(t);
  }, [user]);

  function dismiss() {
    localStorage.setItem(ASKED_KEY, "1");
    setStep(null);
  }

  function requestLocation() {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(() => undefined, () => undefined, {
        timeout: 8000,
      });
    }
  }

  async function requestNotifications() {
    try {
      if ("Notification" in window && Notification.permission === "default") {
        await Notification.requestPermission();
      }
      if ("Notification" in window && Notification.permission === "granted") {
        const { enablePush } = await import("@/lib/push");
        await enablePush();
      }
    } catch {
      // unsupported — ignore
    }
  }

  async function enable() {
    localStorage.setItem(ASKED_KEY, "1");
    if (wantLocation) {
      setStep("location");
      requestLocation();
    }
    if (wantNotifications) {
      setStep("notifications");
      await requestNotifications();
    }
    setStep("done");
    setTimeout(() => setStep(null), 2500);
  }

  if (!step) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/40 flex items-end justify-center">
      <div className="anim-fade-up w-full max-w-md bg-white rounded-t-3xl p-6 pb-8">
        <div className="w-10 h-1 rounded-full bg-line mx-auto mb-4" />
        {step === "confirm" ? (
          <>
            <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center text-xl mb-3">
              <i className="fa-solid fa-triangle-exclamation" aria-hidden />
            </div>
            <h2 className="text-lg font-extrabold text-center">Are you sure?</h2>
            <p className="text-sm text-text-light mt-2 text-center leading-relaxed">
              These permissions power Cravely&apos;s main purpose:
            </p>
            <div className="space-y-2 mt-4">
              <div className="flex items-center gap-3 rounded-xl bg-background border border-line px-4 py-2.5">
                <i className="fa-solid fa-location-dot text-primary w-5 text-center" aria-hidden />
                <span className="text-[13px]">
                  <b>Nearby restaurants</b> — real distances from you
                </span>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-background border border-line px-4 py-2.5">
                <i className="fa-solid fa-bell text-primary w-5 text-center" aria-hidden />
                <span className="text-[13px]">
                  <b>Offer alerts</b> — deals from kitchens near you
                </span>
              </div>
            </div>
            <button
              onClick={() => void enable()}
              className="pressable w-full bg-primary text-white py-3 rounded-full font-semibold mt-5 shadow-md"
            >
              Enable permissions
            </button>
            <button
              onClick={dismiss}
              className="w-full text-center text-xs text-text-light hover:text-primary transition-colors mt-3"
            >
              Skip anyway — I understand
            </button>
          </>
        ) : step === "done" ? (
          <div className="text-center py-4">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-green-100 text-green-600 flex items-center justify-center text-xl mb-3">
              <i className="fa-solid fa-check" aria-hidden />
            </div>
            <h2 className="font-extrabold">You&apos;re set!</h2>
            <p className="text-sm text-text-light mt-1">
              Nearby picks and offer alerts are ready.
            </p>
          </div>
        ) : step === "ask" ? (
          <>
            <h2 className="text-lg font-extrabold">
              Get the most out of Cravely
            </h2>
            <p className="text-sm text-text-light mt-1">
              Two quick permissions make the app actually useful:
            </p>
            <label className="flex items-center gap-3 rounded-xl border border-line bg-card px-4 py-3 mt-4 cursor-pointer">
              <input
                type="checkbox"
                checked={wantLocation}
                onChange={(e) => setWantLocation(e.target.checked)}
                className="accent-primary w-4 h-4"
              />
              <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                <i className="fa-solid fa-location-dot" aria-hidden />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-semibold">Location</span>
                <span className="block text-[11px] text-text-light">
                  Nearby restaurants, real distances
                </span>
              </span>
            </label>
            <label className="flex items-center gap-3 rounded-xl border border-line bg-card px-4 py-3 mt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={wantNotifications}
                onChange={(e) => setWantNotifications(e.target.checked)}
                className="accent-primary w-4 h-4"
              />
              <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                <i className="fa-solid fa-bell" aria-hidden />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-semibold">Notifications</span>
                <span className="block text-[11px] text-text-light">
                  Offers and updates from kitchens you love
                </span>
              </span>
            </label>
            <button
              onClick={() => void enable()}
              className="pressable w-full bg-primary text-white py-3 rounded-full font-semibold mt-5 shadow-md"
            >
              Enable
            </button>
            <button
              onClick={() => setStep("confirm")}
              className="w-full text-center text-xs text-text-light hover:text-primary transition-colors mt-3"
            >
              Maybe later
            </button>
          </>
        ) : (
          <div className="text-center py-4">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-xl mb-3">
              <i
                className={`fa-solid ${step === "location" ? "fa-location-dot" : "fa-bell"} fa-bounce`}
                aria-hidden
              />
            </div>
            <h2 className="font-extrabold">
              {step === "location" ? "Allow location access" : "Allow notifications"}
            </h2>
            <p className="text-sm text-text-light mt-1">
              Confirm the browser prompt to continue.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
