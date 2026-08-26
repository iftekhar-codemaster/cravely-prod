"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import NotificationsBell from "@/components/NotificationsBell";

const LINES = [
  "Hunger is a compass.",
  "Some nights are kacchi nights.",
  "Follow the smell of garlic.",
  "Good food is cheaper than therapy.",
  "The town eats well tonight.",
];

export default function HomeHeader({
  dishes,
  kitchens,
}: {
  dishes: number;
  kitchens: number;
}) {
  const [lineIdx, setLineIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setLineIdx((v) => (v + 1) % LINES.length), 5000);
    return () => clearInterval(t);
  }, []);

  const now = new Date();
  const hour = now.getHours();

  return (
    <div className="anim-fade-up relative z-10">
      <div className="flex items-center gap-2 mb-3">
        <Image
          src="/icon-192.png"
          alt="Cravely logo"
          width={32}
          height={32}
          priority
          className="rounded-lg"
        />
        <span className="text-lg font-extrabold leading-none">
          <span className="text-primary">Crave</span>ly
        </span>
        <NotificationsBell />
      </div>
      <div className="flex items-center justify-between gap-3">
        {/* Location chip */}
        <Link
          href="/maps"
          className="flex items-center gap-1.5 text-[11px] font-semibold text-text-light bg-card border border-line rounded-full px-2.5 py-1.5 pressable"
        >
          <i className="fa-solid fa-location-dot text-primary" aria-hidden />
          Thakurgaon
          <span className="text-green-600">· {kitchens} kitchens</span>
        </Link>
        <span className="text-[11px] text-text-light">
          {hour >= 5 && hour < 12
            ? "Morning"
            : hour >= 12 && hour < 17
              ? "Afternoon"
              : hour >= 17 && hour < 21
                ? "Evening"
                : "Late night"}
          <i
            className={`fa-solid ml-1.5 ${
              hour >= 5 && hour < 21 ? "fa-cloud-sun" : "fa-moon"
            }`}
            aria-hidden
          />
        </span>
      </div>

      {/* Rotating crave line — swaps every few seconds */}
      <h1 className="text-[26px] leading-tight font-extrabold mt-3 h-[68px] flex items-end">
        <span key={lineIdx} className="anim-fade-up">
          {LINES[lineIdx]}
        </span>
      </h1>

      <p className="text-xs text-text-light mt-1">
        <b className="text-foreground">{dishes}</b> dishes from{" "}
        <b className="text-foreground">{kitchens}</b> kitchens, priced honestly.
      </p>
    </div>
  );
}
