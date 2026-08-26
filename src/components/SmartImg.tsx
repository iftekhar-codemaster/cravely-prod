"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Image with built-in shimmer preloader: gray shimmer block until the image
 * finishes loading, then a quick fade/scale-in. Prevents the "popping" feel.
 * Retries once on failure (transient CDN rate limits).
 */
export default function SmartImg({
  src,
  alt = "",
  className = "",
  imgClassName = "",
  eager,
}: {
  src: string;
  alt?: string;
  className?: string;
  imgClassName?: string;
  eager?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [prevSrc, setPrevSrc] = useState(src);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset load state when the src changes (React-recommended render-time reset)
  if (prevSrc !== src) {
    setPrevSrc(src);
    setLoaded(false);
    setFailed(false);
    setAttempt(0);
  }

  useEffect(() => {
    if (!failed || attempt >= 2) return;
    retryTimer.current = setTimeout(
      () => {
        setFailed(false);
        setAttempt((a) => a + 1);
      },
      1500 * attempt,
    );
    return () => {
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, [failed, attempt]);

  return (
    <span className={`relative block overflow-hidden ${className}`}>
      {!loaded && !failed && <span className="absolute inset-0 skel" aria-hidden />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={attempt}
        src={src}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={`${imgClassName} transition-[opacity,transform] duration-500 ease-out will-change-transform ${
          loaded ? "opacity-100 scale-100" : failed ? "opacity-100" : "opacity-0 scale-105"
        }`}
      />
      {failed && attempt >= 2 && (
        <span className="absolute inset-0 flex items-center justify-center text-text-light">
          <i className="fa-solid fa-image" aria-hidden />
        </span>
      )}
    </span>
  );
}
