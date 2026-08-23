"use client";

import { useEffect, useRef, useState } from "react";
import type { Offer } from "@/lib/data";

const MS = 3800;

export default function OfferCarousel({ offers }: { offers: Offer[] }) {
  const [i, setI] = useState(0);
  const paused = useRef(false);
  const n = offers.length;

  useEffect(() => {
    if (n <= 1) return;
    const t = setInterval(() => {
      if (!paused.current) setI((v) => (v + 1) % n);
    }, MS);
    return () => clearInterval(t);
  }, [n]);

  if (n === 0) {
    return <div className="h-[140px] rounded-xl skel" />;
  }

  return (
    <div
      className="overflow-hidden rounded-xl"
      onPointerDown={() => (paused.current = true)}
      onPointerUp={() => (paused.current = false)}
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
      onTouchStart={() => (paused.current = true)}
      onTouchEnd={() => (paused.current = false)}
      role="region"
      aria-roledescription="carousel"
      aria-label="Offers"
    >
      <div
        className="flex will-change-transform"
        style={{
          transform: `translate3d(-${i * 100}%, 0, 0)`,
          transition: "transform 600ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        {offers.map((offer) => (
          <div
            key={offer.title}
            className="min-w-full h-[150px] rounded-xl p-6 text-white flex flex-col justify-center shadow-card bg-cover bg-center select-none"
            style={{
              backgroundImage: `url('${offer.image}')`,
              backgroundColor: offer.bg,
              backgroundBlendMode: "overlay",
            }}
          >
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">
              Limited
            </span>
            <h3 className="font-extrabold text-xl mt-1">{offer.title}</h3>
            <p className="text-sm opacity-90 mt-1">{offer.code}</p>
          </div>
        ))}
      </div>

      {/* Dots */}
      {n > 1 && (
        <div className="flex justify-center gap-2 mt-3">
          {offers.map((o, idx) => (
            <button
              key={o.title}
              onClick={() => setI(idx)}
              aria-label={`Go to offer ${idx + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === i ? "w-6 bg-primary" : "w-1.5 bg-gray-300"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
