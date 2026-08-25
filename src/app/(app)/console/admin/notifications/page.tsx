"use client";

import { useCallback, useEffect, useState } from "react";
import { deleteDoc, doc } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";
import {
  fetchNotifications,
  sendNotification,
  type NotificationAudience,
  type NotificationDoc,
} from "@/lib/notifications";
import { getAllRestaurants, type Restaurant } from "@/lib/data";

const inputCls =
  "w-full rounded-xl border border-line bg-card px-4 py-3 text-sm outline-none focus:border-primary transition-colors";

function toMillis(v: unknown): number {
  if (!v || typeof v !== "object") return 0;
  const t = v as { toDate?: () => Date };
  return typeof t.toDate === "function" ? t.toDate().getTime() : 0;
}

export default function AdminNotificationsPage() {
  const { profile } = useAuth();
  const [restaurants, setRestaurants] = useState<Restaurant[] | null>(null);
  const [sent, setSent] = useState<NotificationDoc[] | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audienceType, setAudienceType] = useState<"all" | "range">("all");
  const [restaurantId, setRestaurantId] = useState("");
  const [radiusKm, setRadiusKm] = useState("10");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const load = useCallback(async () => {
    setSent(await fetchNotifications().catch(() => []));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      void Promise.all([getAllRestaurants(), load()])
        .then(([rows]) => setRestaurants(rows))
        .catch(() => setRestaurants([]));
    }, 0);
    return () => clearTimeout(t);
  }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(false);
    if (!title.trim()) return setError("Add a title first.");
    if (title.trim().length > 120) return setError("Title must be 120 characters or fewer.");
    if (body.length > 500) return setError("Body must be 500 characters or fewer.");

    let audience: NotificationAudience = { type: "all" };
    let ctxRestaurantId = restaurantId || undefined;
    if (audienceType === "range") {
      const r = restaurants?.find((x) => x.id === restaurantId);
      if (!r) return setError("Pick a restaurant to center the radius on.");
      if (typeof r.lat !== "number" || typeof r.lng !== "number") {
        return setError(`${r.name} has no location set — pick another restaurant.`);
      }
      audience = { type: "range", lat: r.lat, lng: r.lng, radiusKm: Number(radiusKm) || 10 };
      ctxRestaurantId = r.id;
    }

    setBusy(true);
    try {
      await sendNotification({
        title: title.trim(),
        body: body.trim(),
        audience,
        restaurantId: ctxRestaurantId,
      });
      setTitle("");
      setBody("");
      setDone(true);
      await load();
    } catch (err) {
      console.warn(err);
      setError("Send failed — admins only. Check your role and connection.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this notification for everyone?")) return;
    await deleteDoc(doc(getDb()!, "notifications", id));
    await load();
  }

  return (
    <div className="max-w-xl space-y-6 anim-fade-up">
      <div className="rounded-2xl border border-line bg-card p-4 shadow-card">
        <h2 className="font-bold text-sm mb-1">
          <i className="fa-solid fa-bullhorn text-primary mr-2" aria-hidden />
          Send a notification
        </h2>
        <p className="text-[11px] text-text-light mb-4">
          Delivered in-app to the selected audience.
        </p>
        <form onSubmit={submit} className="space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder="Title (e.g. New kacchi spot just opened!)"
            className={inputCls}
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Message (max 500 characters)"
            className={inputCls}
          />
          <div>
            <p className="text-xs font-semibold mb-1">Audience</p>
            <div className="flex gap-2">
              {(
                [
                  { value: "all", label: "Everyone", icon: "fa-globe" },
                  { value: "range", label: "Within radius of a restaurant", icon: "fa-location-dot" },
                ] as const
              ).map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setAudienceType(o.value)}
                  className={`flex-1 rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${
                    audienceType === o.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-line bg-background text-text-light hover:border-primary/40"
                  }`}
                >
                  <i className={`fa-solid ${o.icon} mr-1.5`} aria-hidden />
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          {audienceType === "range" && (
            <div className="anim-fade-up space-y-3 rounded-xl bg-background p-3">
              <div>
                <label htmlFor="notif-restaurant" className="text-xs font-semibold mb-1 block">
                  Center restaurant
                </label>
                <select
                  id="notif-restaurant"
                  value={restaurantId}
                  onChange={(e) => setRestaurantId(e.target.value)}
                  className={inputCls}
                >
                  <option value="">
                    {restaurants ? "Choose a restaurant…" : "Loading restaurants…"}
                  </option>
                  {(restaurants ?? []).map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="notif-radius" className="text-xs font-semibold mb-1 block">
                  Radius (km)
                </label>
                <input
                  id="notif-radius"
                  type="number"
                  min={1}
                  max={50}
                  value={radiusKm}
                  onChange={(e) => setRadiusKm(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold mb-1">
              Restaurant context <span className="text-text-light font-normal">(optional)</span>
            </p>
            <select
              value={restaurantId}
              onChange={(e) => setRestaurantId(e.target.value)}
              disabled={audienceType === "range"}
              className={`${inputCls} disabled:opacity-60`}
            >
              <option value="">None</option>
              {(restaurants ?? []).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-primary">{error}</p>
          )}
          {done && !error && (
            <p className="rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-700">
              <i className="fa-solid fa-check mr-1.5" aria-hidden />
              Notification sent.
            </p>
          )}
          <button
            type="submit"
            disabled={busy || !title.trim()}
            className="w-full bg-primary text-white rounded-full py-3 font-semibold text-sm disabled:opacity-40 pressable"
          >
            {busy ? "Sending…" : "Send notification"}
          </button>
        </form>
      </div>

      <section>
        <h2 className="font-bold text-sm mb-3">Sent (latest 20)</h2>
        {!sent ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className="h-16 rounded-xl skel" />
            ))}
          </div>
        ) : sent.length === 0 ? (
          <p className="text-sm text-text-light text-center py-6">Nothing sent yet.</p>
        ) : (
          <ul className="space-y-3">
            {sent.slice(0, 20).map((n) => (
              <li key={n.id} className="rounded-xl border border-line bg-card p-3">
                <div className="flex items-start gap-3">
                  <span className="w-9 h-9 rounded-xl bg-primary/8 text-primary flex items-center justify-center flex-shrink-0">
                    <i className="fa-solid fa-bell text-sm" aria-hidden />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{n.title}</p>
                    <p className="text-[11px] text-text-light line-clamp-2">{n.body}</p>
                    <p className="text-[10px] text-text-light mt-1">
                      {toMillis(n.createdAt)
                        ? new Date(toMillis(n.createdAt)).toLocaleString()
                        : "sending…"}{" "}
                      ·{" "}
                      {n.audience?.type === "range"
                        ? `${n.audience.radiusKm} km radius`
                        : "Everyone"}
                    </p>
                  </div>
                  {profile?.role === "super_admin" && (
                    <button
                      onClick={() => void remove(n.id).catch(() => alert("Delete failed"))}
                      aria-label={`Delete ${n.title}`}
                      className="w-7 h-7 rounded-full bg-background text-text-light hover:text-red-500 transition-colors flex-shrink-0"
                    >
                      <i className="fa-solid fa-trash text-xs" aria-hidden />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
