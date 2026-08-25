"use client";

import { useEffect, useState } from "react";
import { APP_URL } from "@/lib/site";

type BipEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * Header CTA on the landing page. Uses the browser's native PWA install
 * prompt when available (Chrome/Edge/Android); otherwise sends the visitor
 * to the app with ?install=1 so the app can show install instructions.
 */
export default function InstallNowButton() {
  const [deferred, setDeferred] = useState<BipEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BipEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) {
    return (
      <a
        href={APP_URL}
        className="pressable bg-primary text-white font-bold text-sm rounded-full px-4 py-2 shadow-md"
      >
        Open app
      </a>
    );
  }

  async function install() {
    if (deferred) {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === "accepted") setInstalled(true);
      setDeferred(null);
    } else {
      window.open(`${APP_URL}/?install=1`, "_self");
    }
  }

  return (
    <button
      onClick={() => void install()}
      className="pressable bg-primary text-white font-bold text-sm rounded-full px-4 py-2 shadow-md"
    >
      Install now
    </button>
  );
}
