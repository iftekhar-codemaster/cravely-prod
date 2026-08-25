"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";

type Stats = {
  users: number;
  restaurants: number;
  foods: number;
  pending: number;
};

export default function AdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    const db = getDb();
    if (!db) return;
    Promise.all([
      getDocs(collection(db, "users")),
      getDocs(collection(db, "restaurants")),
      getDocs(collection(db, "foods")),
      getDocs(query(collection(db, "applications"), where("status", "==", "pending"))),
    ]).then(([users, restaurants, foods, pending]) =>
      setStats({
        users: users.size,
        restaurants: restaurants.size,
        foods: foods.size,
        pending: pending.size,
      }),
    );
  }, []);

  const cards = [
    { icon: "fa-users", label: "Users", value: stats?.users, href: "/console/admin/users" },
    { icon: "fa-store", label: "Restaurants", value: stats?.restaurants, href: "/console/admin/restaurants" },
    { icon: "fa-bowl-food", label: "Dishes", value: stats?.foods },
    {
      icon: "fa-file-signature",
      label: "Pending applications",
      value: stats?.pending,
      href: "/console/admin/applications",
      accent: (stats?.pending ?? 0) > 0,
    },
  ];

  return (
    <div>
      <h1 className="text-xl font-extrabold mb-5">Overview</h1>
      <div className="grid grid-cols-2 gap-3">
        {cards.map((c) => (
          <StatCard key={c.label} {...c} />
        ))}
      </div>

      <div className="mt-6 rounded-xl border border-line bg-card p-4">
        <h2 className="font-bold text-sm mb-2">Quick actions</h2>
        <div className="flex flex-wrap gap-2 mt-3">
          <Link
            href="/console/admin/applications"
            className="bg-primary text-white text-xs font-semibold px-4 py-2 rounded-full"
          >
            Review applications
          </Link>
          <Link
            href="/console/admin/security"
            className="border border-line text-xs font-semibold px-4 py-2 rounded-full"
          >
            Security settings
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  href,
  accent,
}: {
  icon: string;
  label: string;
  value?: number;
  href?: string;
  accent?: boolean;
}) {
  const body = (
    <div
      className={`rounded-xl border p-4 bg-card shadow-card transition-transform ${
        accent ? "border-primary" : "border-line"
      } ${href ? "hover:-translate-y-0.5" : ""}`}
    >
      <i className={`fa-solid ${icon} ${accent ? "text-primary" : "text-text-light"}`} aria-hidden />
      <div className="mt-2 text-2xl font-extrabold">
        {value === undefined ? "…" : value}
      </div>
      <div className="text-xs text-text-light">{label}</div>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
