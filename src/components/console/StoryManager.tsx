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
  where,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { audit } from "@/lib/audit";
import { getAllRestaurants } from "@/lib/data";
import { uploadImage } from "@/lib/storage";
import SmartImg from "@/components/SmartImg";

type Story = {
  id: string;
  restaurantId: string;
  name: string;
  image: string;
  caption?: string;
};

const inputCls =
  "w-full rounded-xl border border-line bg-card px-4 py-3 text-sm outline-none focus:border-primary transition-colors";

export default function StoryManager({ restaurantId }: { restaurantId: string }) {
  const [stories, setStories] = useState<Story[] | null>(null);
  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const db = getDb()!;
    const snap = await getDocs(
      query(collection(db, "stories"), where("restaurantId", "==", restaurantId)),
    );
    setStories(
      snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Story, "id">) })),
    );
    const all = await getAllRestaurants();
    setName(all.find((r) => r.id === restaurantId)?.name ?? "");
  }, [restaurantId]);

  useEffect(() => {
    const t = setTimeout(() => void load().catch(() => setStories([])), 0);
    return () => clearTimeout(t);
  }, [load]);

  async function handleUpload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      setImage(await uploadImage(file, "story", restaurantId));
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

  async function publish() {
    if (!image.trim()) {
      setError("Add an image URL first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await addDoc(collection(getDb()!, "stories"), {
        restaurantId,
        name,
        image: image.trim(),
        caption: caption.trim(),
        createdAt: serverTimestamp(),
      });
      setImage("");
      setCaption("");
      void audit("story.publish", restaurantId, { caption });
      await load();
    } catch (err) {
      console.warn(err);
      setError("Publish failed — only the restaurant owner or an admin can post.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    await deleteDoc(doc(getDb()!, "stories", id));
    void audit("story.delete", id);
    await load();
  }

  return (
    <section className="anim-fade-up pb-24">
      {/* Composer */}
      <div className="rounded-2xl border border-line bg-card p-4 shadow-card">
        <h2 className="font-bold text-sm mb-3">
          <i className="fa-solid fa-circle-plus text-primary mr-2" aria-hidden />
          New story
        </h2>
        {error && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-primary">{error}</p>
        )}
        <div className="space-y-3">
          <label
            className={`inline-flex items-center gap-2 rounded-full border border-line bg-background px-4 py-2 text-xs font-semibold cursor-pointer hover:border-primary transition-colors ${
              uploading ? "opacity-50 pointer-events-none" : ""
            }`}
          >
            <i
              className={`fa-solid ${uploading ? "fa-spinner animate-spin" : "fa-camera"}`}
              aria-hidden
            />
            {uploading ? "Uploading…" : "Upload photo"}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => void handleUpload(e.target.files?.[0])}
              className="hidden"
            />
          </label>
          <input
            value={image}
            onChange={(e) => setImage(e.target.value)}
            placeholder="…or paste an image URL (portrait works best)"
            className={inputCls}
          />
          {image.trim() && (
            <SmartImg
              src={image}
              alt=""
              eager
              className="w-full h-44 rounded-xl bg-gray-100"
              imgClassName="w-full h-full object-cover"
            />
          )}
          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Caption (optional)"
            className={inputCls}
          />
          <button
            onClick={() => void publish()}
            disabled={busy || !image.trim()}
            className="w-full bg-primary text-white rounded-full py-3 font-semibold text-sm disabled:opacity-40 pressable"
          >
            {busy ? "Publishing…" : "Publish story"}
          </button>
        </div>
      </div>

      {/* Existing */}
      <h2 className="font-bold text-sm mt-6 mb-3">Live stories</h2>
      {!stories ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-16 rounded-xl skel" />
          ))}
        </div>
      ) : stories.length === 0 ? (
        <p className="text-sm text-text-light text-center py-6">
          No stories yet. Show off today&apos;s specials!
        </p>
      ) : (
        <ul className="space-y-3">
          {stories.map((s) => (
            <li
              key={s.id}
              className="flex items-center gap-3 rounded-xl border border-line bg-card p-3"
            >
              <SmartImg
                src={s.image}
                alt=""
                className="w-11 h-11 rounded-lg bg-gray-100 flex-shrink-0"
                imgClassName="w-full h-full object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{s.caption || s.name}</p>
                <p className="text-[11px] text-text-light truncate">{s.image}</p>
              </div>
              <button
                onClick={() => void remove(s.id).catch(() => alert("Delete failed"))}
                aria-label="Delete story"
                className="w-7 h-7 rounded-full bg-background text-text-light hover:text-red-500 transition-colors flex-shrink-0"
              >
                <i className="fa-solid fa-trash text-xs" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
