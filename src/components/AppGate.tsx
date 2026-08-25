"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import { useAuth } from "@/components/AuthProvider";

function Splash() {
  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white"
      role="status"
      aria-label="Cravely is loading"
    >
      <Image
        src="/icon-192.png"
        alt="Cravely logo"
        width={72}
        height={72}
        className="rounded-2xl shadow-md anim-pop"
        priority
      />
      <div className="mt-4 flex items-center gap-2 text-3xl font-extrabold">
        <span className="text-primary">Crave</span>
        <span>ly</span>
      </div>
      <div className="mt-6 h-1.5 w-36 overflow-hidden rounded-full bg-gray-200">
        <div className="h-full w-1/2 animate-[loadingbar_1.1s_ease-in-out_infinite] rounded-full bg-primary" />
      </div>
      <p className="mt-4 text-xs text-text-light">Finding what you crave…</p>
    </div>
  );
}

export default function AppGate({ children }: { children: ReactNode }) {
  const { loading } = useAuth();
  const [minWaitDone, setMinWaitDone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMinWaitDone(true), 800);
    return () => clearTimeout(t);
  }, []);

  const ready = !loading && minWaitDone;

  return (
    <>
      {!ready && <Splash />}
      <div
        className={`transition-opacity duration-300 ${
          ready ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        {children}
      </div>
    </>
  );
}
