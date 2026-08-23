"use client";

const LIKED_KEY = "cravely:liked";
const PACKAGE_KEY = "cravely:package";

function read(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function write(key: string, ids: string[]) {
  localStorage.setItem(key, JSON.stringify(ids));
  window.dispatchEvent(new Event("cravely:store"));
}

export function getLiked(): string[] {
  return read(LIKED_KEY);
}

export function toggleLiked(id: string): boolean {
  const current = getLiked();
  const next = current.includes(id)
    ? current.filter((x) => x !== id)
    : [...current, id];
  write(LIKED_KEY, next);
  return next.includes(id);
}

export function getPackage(): string[] {
  return read(PACKAGE_KEY);
}

export function addToPackage(id: string): boolean {
  // returns true if added, false if removed
  const current = getPackage();
  let next: string[];
  let added: boolean;
  if (current.includes(id)) {
    next = current.filter((x) => x !== id);
    added = false;
  } else {
    next = [...current, id];
    added = true;
  }
  write(PACKAGE_KEY, next);
  return added;
}
