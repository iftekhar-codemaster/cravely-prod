"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SearchBar() {
  const [q, setQ] = useState("");
  const router = useRouter();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
      }}
      className="flex bg-card rounded-[30px] px-5 py-2 shadow-card border border-line"
      role="search"
    >
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        type="search"
        placeholder="Search for food..."
        aria-label="Search for food"
        className="flex-1 border-none outline-none py-2.5 text-base bg-transparent min-w-0"
      />
      <button
        type="submit"
        aria-label="Search"
        className="bg-transparent border-none text-text-light cursor-pointer text-lg"
      >
        <i className="fa-solid fa-magnifying-glass" aria-hidden />
      </button>
    </form>
  );
}
