"use client";

import { useRouter } from "next/navigation";

export default function CloseButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      aria-label="Close and go back"
      className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-white/95 shadow-[0_4px_10px_rgba(0,0,0,0.15)]
        flex items-center justify-center text-foreground hover:text-primary transition-colors"
    >
      <i className="fa-solid fa-xmark" aria-hidden />
    </button>
  );
}
