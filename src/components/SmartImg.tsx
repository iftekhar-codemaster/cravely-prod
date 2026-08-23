"use client";

import { useState } from "react";

/**
 * Image with built-in shimmer preloader: gray shimmer block until the image
 * finishes loading, then a quick fade/scale-in. Prevents the "popping" feel.
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

  return (
    <span className={`relative block overflow-hidden ${className}`}>
      {!loaded && !failed && <span className="absolute inset-0 skel" aria-hidden />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
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
      {failed && (
        <span className="absolute inset-0 flex items-center justify-center text-text-light">
          <i className="fa-solid fa-image" aria-hidden />
        </span>
      )}
    </span>
  );
}
