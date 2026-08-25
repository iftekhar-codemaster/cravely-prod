"use client";

import { useEffect, useState } from "react";

type BipEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "cravely:installDismissed";

/**
 * PWA install surface inside the app. If the visitor arrived via the
 * landing page's "Install now" (?install=1), fires the native prompt
 * immediately (Chrome/Edge/Android) or shows iOS Add-to-Home-Screen
 * instructions. Otherwise shows a small dismissible banner while the
 * browser reports installability.
 */
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BipEvent | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [banner, setBanner] = useState(false);

  useEffect(() => {
    const wantsInstall =
      new URLSearchParams(window.location.search).get("install") === "1";
    if (localStorage.getItem(DISMISS_KEY) === "1" && !wantsInstall) return;

    const isIos =
      /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

    const onBip = (e: Event) => {
      e.preventDefault();
      const ev = e as BipEvent;
      setDeferred(ev);
      if (wantsInstall) {
        void ev.prompt().then(() => {
          window.history.replaceState({}, "", "/");
        });
      } else if (localStorage.getItem(DISMISS_KEY) !== "1") {
        setBanner(true);
      }
    };
    const onInstalled = () => {
      setDeferred(null);
      setBanner(false);
      setShowIosHelp(false);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);

    // iOS never fires beforeinstallprompt — show manual instructions.
    if (wantsInstall && isIos) {
      const t = setTimeout(() => setShowIosHelp(true), 0);
      return () => {
        clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", onBip);
        window.removeEventListener("appinstalled", onInstalled);
      };
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setBanner(false);
    setShowIosHelp(false);
  }

  if (showIosHelp) {
    return (
      <div className="fixed inset-0 z-[70] bg-black/40 flex items-end justify-center">
        <div className="anim-fade-up w-full max-w-md bg-white rounded-t-3xl p-6 pb-8">
          <div className="w-10 h-1 rounded-full bg-line mx-auto mb-4" />
          <div className="text-center">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-xl mb-3">
              <i className="fa-brands fa-apple" aria-hidden />
            </div>
            <h2 className="font-extrabold">Install Cravely</h2>
            <p className="text-sm text-text-light mt-2 leading-relaxed">
              On iPhone/iPad: tap the <b>Share</b> icon{" "}
              <i className="fa-solid fa-arrow-up-from-bracket mx-0.5" aria-hidden /> in
              Safari&apos;s toolbar, then choose{" "}
              <b>Add to Home Screen</b>.
            </p>
          </div>
          <button
            onClick={dismiss}
            className="pressable w-full bg-primary text-white py-3 rounded-full font-semibold mt-5"
          >
            Got it
          </button>
        </div>
      </div>
    );
  }

  if (!banner || !deferred) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2.5rem)] max-w-[calc(28rem-2.5rem)]">
      <div className="anim-fade-up bg-white rounded-2xl border border-line shadow-[0_12px_30px_rgba(0,0,0,0.15)] p-4 flex items-center gap-3">
        <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
          <i className="fa-solid fa-mobile-screen" aria-hidden />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold">Install Cravely</p>
          <p className="text-[11px] text-text-light">
            Full-screen app, works from your home screen.
          </p>
        </div>
        <button
          onClick={() => void deferred.prompt()}
          className="pressable bg-primary text-white text-xs font-bold rounded-full px-4 py-2 flex-shrink-0"
        >
          Install
        </button>
        <button
          onClick={dismiss}
          aria-label="Dismiss install prompt"
          className="text-text-light hover:text-foreground p-1 flex-shrink-0"
        >
          <i className="fa-solid fa-xmark" aria-hidden />
        </button>
      </div>
    </div>
  );
}
