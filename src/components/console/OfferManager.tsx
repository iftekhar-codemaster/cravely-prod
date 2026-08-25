"use client";

import { useCallback, useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { audit } from "@/lib/audit";
import { uploadImage } from "@/lib/storage";
import { sendNotification } from "@/lib/notifications";
import { getAllRestaurants } from "@/lib/data";
import SmartImg from "@/components/SmartImg";

type Offer = {
  id: string;
  title: string;
  code: string;
  bg: string;
  image: string;
  restaurantId?: string;
  expiresAt?: string;
  active?: boolean;
};

const inputCls =
  "w-full rounded-xl border border-line bg-card px-4 py-3 text-sm outline-none focus:border-primary transition-colors";

const DEFAULT_BG = "rgba(0,0,0,0.5)";

function isExpired(o: Offer): boolean {
  return Boolean(o.expiresAt && new Date(o.expiresAt).getTime() <= Date.now());
}

export default function OfferManager({
  restaurantId,
  canWrite,
}: {
  restaurantId: string;
  canWrite: boolean;
}) {
  const [offers, setOffers] = useState<Offer[] | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [image, setImage] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [active, setActive] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [announcingId, setAnnouncingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const db = getDb()!;
    const snap = await getDocs(
      query(collection(db, "offers"), where("restaurantId", "==", restaurantId)),
    );
    const rows = snap.docs.map(
      (d) => ({ id: d.id, ...(d.data() as Omit<Offer, "id">) }) as Offer,
    );
    rows.sort((a, b) => a.title.localeCompare(b.title));
    setOffers(rows);
  }, [restaurantId]);

  useEffect(() => {
    const t = setTimeout(() => void load().catch(() => setOffers([])), 0);
    return () => clearTimeout(t);
  }, [load]);

  function resetForm() {
    setEditingId(null);
    setTitle("");
    setCode("");
    setImage("");
    setExpiresAt("");
    setActive(true);
  }

  function startEdit(o: Offer) {
    setEditingId(o.id);
    setTitle(o.title);
    setCode(o.code);
    setImage(o.image);
    setExpiresAt(o.expiresAt ? o.expiresAt.slice(0, 10) : "");
    setActive(o.active !== false);
    setError(null);
  }

  async function handleUpload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      setImage(await uploadImage(file, "offer", restaurantId));
    } catch (err) {
      console.warn(err);
      setError(
        err instanceof Error
          ? `${err.message} You can paste an image URL below instead.`
          : "Upload failed. You can paste an image URL below instead.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!title.trim() || !code.trim()) {
      setError("Add a title and promo code first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload = {
        restaurantId,
        title: title.trim(),
        code: code.trim(),
        bg: DEFAULT_BG,
        image: image.trim(),
        active,
        expiresAt: expiresAt
          ? new Date(`${expiresAt}T23:59:59`).toISOString()
          : null,
      };
      if (editingId) {
        await updateDoc(doc(getDb()!, "offers", editingId), payload);
        void audit("offer.update", editingId, { title: payload.title });
      } else {
        const ref = await addDoc(collection(getDb()!, "offers"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        void audit("offer.publish", ref.id, { title: payload.title });
      }
      resetForm();
      await load();
    } catch (err) {
      console.warn(err);
      setError("Save failed — only an admin can publish offers right now.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    await deleteDoc(doc(getDb()!, "offers", id));
    void audit("offer.delete", id);
    if (editingId === id) resetForm();
    await load();
  }

  async function announce(o: Offer) {
    const name =
      (await getAllRestaurants()).find((r) => r.id === restaurantId)?.name ??
      "a local restaurant";
    const body = o.code ? `${o.title} — code ${o.code}` : o.title;
    await sendNotification({
      title: `🎉 New offer at ${name}`,
      body,
      audience: { type: "all" },
      offerId: o.id,
      restaurantId,
    });
  }

  return (
    <section className="anim-fade-up">
      {/* Composer */}
      <div className="rounded-2xl border border-line bg-card p-4 shadow-card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-sm">
            <i className="fa-solid fa-tag text-primary mr-2" aria-hidden />
            {editingId ? "Edit offer" : "New offer"}
          </h2>
          {editingId && (
            <button
              onClick={resetForm}
              className="text-xs font-semibold text-text-light hover:text-primary"
            >
              Cancel
            </button>
          )}
        </div>
        {!canWrite && (
          <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
            <i className="fa-solid fa-lock mr-1.5" aria-hidden />
            Offer publishing requires admin approval — contact support.
          </p>
        )}
        {error && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-primary">{error}</p>
        )}
        <div className="space-y-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Offer title (e.g. 20% Off All Burgers)"
            className={inputCls}
          />
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Promo code or short note (e.g. BURGER20)"
            className={inputCls}
          />
          <label
            className={`inline-flex items-center gap-2 rounded-full border border-line bg-background px-4 py-2 text-xs font-semibold cursor-pointer hover:border-primary transition-colors ${
              uploading || !canWrite ? "opacity-50 pointer-events-none" : ""
            }`}
          >
            <i
              className={`fa-solid ${uploading ? "fa-spinner animate-spin" : "fa-camera"}`}
              aria-hidden
            />
            {uploading ? "Uploading…" : "Upload banner"}
            <input
              type="file"
              accept="image/*"
              disabled={!canWrite}
              onChange={(e) => void handleUpload(e.target.files?.[0])}
              className="hidden"
            />
          </label>
          <input
            value={image}
            onChange={(e) => setImage(e.target.value)}
            disabled={!canWrite}
            placeholder="…or paste a banner image URL (landscape works best)"
            className={inputCls}
          />
          {image.trim() && (
            <SmartImg
              src={image}
              alt=""
              eager
              className="w-full h-32 rounded-xl bg-gray-100"
              imgClassName="w-full h-full object-cover"
            />
          )}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-xs font-semibold mb-1">Expires</p>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                disabled={!canWrite}
                className={inputCls}
              />
            </div>
            <label className="flex items-center gap-2 pt-5 text-sm font-semibold cursor-pointer select-none">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                disabled={!canWrite}
                className="w-4 h-4 accent-[var(--color-primary)]"
              />
              Active
            </label>
          </div>
          <button
            onClick={() => void save()}
            disabled={busy || !canWrite || !title.trim() || !code.trim()}
            className="w-full bg-primary text-white rounded-full py-3 font-semibold text-sm disabled:opacity-40 pressable"
          >
            {busy ? "Saving…" : editingId ? "Save changes" : "Publish offer"}
          </button>
        </div>
      </div>

      {/* Existing */}
      <h2 className="font-bold text-sm mt-6 mb-3">Your offers</h2>
      {!offers ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-16 rounded-xl skel" />
          ))}
        </div>
      ) : offers.length === 0 ? (
        <p className="text-sm text-text-light text-center py-6">
          No offers yet. Create one to appear on the home carousel!
        </p>
      ) : (
        <ul className="space-y-3">
          {offers.map((o) => {
            const expired = isExpired(o);
            const live = o.active !== false && !expired;
            return (
              <li
                key={o.id}
                className="flex items-center gap-3 rounded-xl border border-line bg-card p-3"
              >
                <SmartImg
                  src={o.image}
                  alt=""
                  className="w-11 h-11 rounded-lg bg-gray-100 flex-shrink-0"
                  imgClassName="w-full h-full object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{o.title}</p>
                  <p className="text-[11px] text-text-light truncate">
                    {o.code}
                    {o.expiresAt
                      ? ` · expires ${new Date(o.expiresAt).toLocaleDateString()}`
                      : ""}
                  </p>
                </div>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full ${
                    live
                      ? "bg-green-100 text-green-700"
                      : expired
                        ? "bg-gray-100 text-gray-500"
                        : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {live ? "Live" : expired ? "Expired" : "Paused"}
                </span>
                {canWrite && live && (
                  <button
                    onClick={() => {
                      if (!confirm(`Announce "${o.title}" to all users?`)) return;
                      setAnnouncingId(o.id);
                      void announce(o)
                        .catch(() => alert("Announce failed"))
                        .finally(() => setAnnouncingId(null));
                    }}
                    disabled={announcingId === o.id}
                    aria-label={`Announce ${o.title}`}
                    className="w-7 h-7 rounded-full bg-background text-text-light hover:text-primary disabled:opacity-40 transition-colors flex-shrink-0"
                  >
                    <i
                      className={`fa-solid ${announcingId === o.id ? "fa-spinner fa-spin" : "fa-bullhorn"} text-xs`}
                      aria-hidden
                    />
                  </button>
                )}
                <button
                  onClick={() => canWrite && startEdit(o)}
                  disabled={!canWrite}
                  aria-label={`Edit ${o.title}`}
                  className="w-7 h-7 rounded-full bg-background text-text-light hover:text-primary disabled:opacity-40 transition-colors flex-shrink-0"
                >
                  <i className="fa-solid fa-pen text-xs" aria-hidden />
                </button>
                <button
                  onClick={() =>
                    canWrite &&
                    void remove(o.id).catch(() => alert("Delete failed"))
                  }
                  disabled={!canWrite}
                  aria-label={`Delete ${o.title}`}
                  className="w-7 h-7 rounded-full bg-background text-text-light hover:text-red-500 disabled:opacity-40 transition-colors flex-shrink-0"
                >
                  <i className="fa-solid fa-trash text-xs" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
