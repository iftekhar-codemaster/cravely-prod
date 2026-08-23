"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/components/AuthProvider";
import { getDb } from "@/lib/firebase";
import { getCuisines } from "@/lib/data";
import { audit } from "@/lib/audit";

const inputCls =
  "w-full rounded-xl border border-line bg-card px-4 py-3 text-sm outline-none focus:border-primary transition-colors";

/* ---------------- Restaurant application wizard ---------------- */

export function ApplyWizard() {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ name: "", cuisine: "", address: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const steps = ["Identity", "Location", "Review"];
  const canNext =
    (step === 0 && form.name.trim().length >= 2) ||
    step === 1 ||
    step === 2;

  async function submit() {
    if (!user || !form.name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const db = getDb()!;
      await addDoc(collection(db, "applications"), {
        uid: user.uid,
        email: user.email ?? "",
        name: form.name.trim(),
        cuisine: form.cuisine.trim(),
        address: form.address.trim(),
        status: "pending",
        createdAt: serverTimestamp(),
      });
      window.location.reload();
    } catch (err) {
      console.warn(err);
      setError("Could not submit. Try again.");
      setBusy(false);
    }
  }

  return (
    <div className="anim-fade-up">
      <div className="flex gap-2 mb-6">
        {steps.map((s, i) => (
          <div key={s} className="flex-1">
            <div
              className={`h-1.5 rounded-full ${i <= step ? "bg-primary" : "bg-gray-200"}`}
            />
            <span
              className={`block mt-1.5 text-[10px] font-semibold ${
                i <= step ? "text-primary" : "text-text-light"
              }`}
            >
              {i + 1}. {s}
            </span>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-dashed border-line p-3 text-xs text-text-light mb-5">
        <i className="fa-solid fa-circle-info mr-1.5" aria-hidden />
        Every application is verified by an admin before going live.
      </div>
      {error && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-primary">{error}</p>
      )}

      {step === 0 && (
        <div className="space-y-4 anim-fade-up">
          <input
            autoFocus
            placeholder="Restaurant name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputCls}
          />
          <input
            placeholder="Cuisine (e.g. Biryani, Fast Food)"
            value={form.cuisine}
            onChange={(e) => setForm({ ...form, cuisine: e.target.value })}
            className={inputCls}
          />
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4 anim-fade-up">
          <textarea
            rows={3}
            placeholder="Full address"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className={`${inputCls} resize-none`}
          />
        </div>
      )}

      {step === 2 && (
        <div className="rounded-2xl border border-line bg-card p-5 anim-fade-up">
          <div className="font-extrabold text-lg">{form.name}</div>
          <p className="text-xs text-text-light mt-1">
            {form.cuisine || "Cuisine not set"}
          </p>
          <p className="text-xs text-text-light mt-2">{form.address || "No address"}</p>
          <p className="text-[11px] text-text-light mt-3 pt-3 border-t border-line">
            Submitting as <b>{user?.email}</b>. You&apos;ll be notified once verified.
          </p>
        </div>
      )}

      <div className="flex gap-3 mt-6 pb-24">
        {step > 0 && (
          <button
            onClick={() => setStep((s) => s - 1)}
            className="flex-1 border border-line rounded-full py-3 font-semibold text-sm"
          >
            Back
          </button>
        )}
        {step < 2 ? (
          <button
            onClick={() => canNext && setStep((s) => s + 1)}
            disabled={!canNext}
            className="flex-[2] bg-primary text-white rounded-full py-3 font-semibold text-sm disabled:opacity-40 pressable"
          >
            Continue
          </button>
        ) : (
          <button
            onClick={() => void submit()}
            disabled={busy}
            className="flex-[2] bg-primary text-white rounded-full py-3 font-semibold text-sm disabled:opacity-40 pressable"
          >
            {busy ? "Submitting…" : "Submit application"}
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------------- Add-dish wizard ---------------- */

export function AddDishWizard({
  restaurantId,
  onClose,
  onAdded,
}: {
  restaurantId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [form, setForm] = useState({
    name: "",
    category: "",
    price: "",
    description: "",
    image: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => void getCuisines().then(setCuisines), 0);
    return () => clearTimeout(t);
  }, []);

  const steps = ["Basics", "Details", "Review"];
  const priceNum = Number(form.price);
  const previewImage =
    form.image.trim() ||
    `https://loremflickr.com/400/300/${encodeURIComponent(form.category || "food")}`;

  async function submit() {
    if (!user || !form.name.trim() || !priceNum) return;
    setBusy(true);
    setError(null);
    try {
      const db = getDb()!;
      await addDoc(collection(db, "foods"), {
        restaurantId,
        name: form.name.trim(),
        category: form.category.trim() || "Others",
        price: Math.round(priceNum),
        rating: 0,
        reviews: 0,
        image: previewImage,
        description: form.description.trim() || "Delicious — details coming soon.",
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      });
      void audit("food.publish", restaurantId, { name: form.name, price: Math.round(priceNum) });
      onAdded();
    } catch (err) {
      console.warn(err);
      setError("Publish failed. Only the restaurant owner or an admin can add dishes.");
      setBusy(false);
    }
  }

  const canStep =
    (step === 0 && form.name.trim().length >= 2 && priceNum > 0) || step > 0;

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/40 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal
      aria-label="Add a dish"
    >
      <div className="anim-fade-up w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto">
        {/* Sheet header */}
        <div className="sticky top-0 bg-white px-5 pt-4 pb-3 border-b border-line flex items-center justify-between">
          <span className="font-extrabold">New dish</span>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full bg-background text-text-light hover:text-primary transition-colors"
          >
            <i className="fa-solid fa-xmark" aria-hidden />
          </button>
        </div>

        <div className="px-5 py-4">
          {/* Stepper */}
          <div className="flex gap-2 mb-5">
            {steps.map((s, i) => (
              <div key={s} className="flex-1">
                <div className={`h-1.5 rounded-full ${i <= step ? "bg-primary" : "bg-gray-200"}`} />
                <span className={`block mt-1.5 text-[10px] font-semibold ${i <= step ? "text-primary" : "text-text-light"}`}>
                  {i + 1}. {s}
                </span>
              </div>
            ))}
          </div>

          {error && (
            <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-primary">{error}</p>
          )}

          {step === 0 && (
            <div className="space-y-4 anim-fade-up">
              <input
                autoFocus
                placeholder="Dish name (e.g. Mutton Kacchi)"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputCls}
              />
              <input
                type="number"
                min={1}
                placeholder="Price in ৳ (e.g. 320)"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className={inputCls}
              />
              <div>
                <p className="text-xs font-semibold mb-2">Category</p>
                <div className="flex flex-wrap gap-2">
                  {cuisines.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm({ ...form, category: c })}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        form.category === c
                          ? "bg-primary text-white border-primary"
                          : "border-line bg-card text-text-light"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4 anim-fade-up">
              <textarea
                rows={4}
                placeholder="Description — what makes it special?"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className={`${inputCls} resize-none`}
              />
              <input
                placeholder="Image URL (optional — we'll fetch a fitting photo)"
                value={form.image}
                onChange={(e) => setForm({ ...form, image: e.target.value })}
                className={inputCls}
              />
              <div className="rounded-xl overflow-hidden border border-line">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewImage} alt="" className="w-full h-36 object-cover" />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="anim-fade-up">
              <div className="rounded-2xl overflow-hidden border border-line">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewImage} alt="" className="w-full h-40 object-cover" />
              </div>
              <div className="flex justify-between items-start mt-3">
                <div>
                  <div className="font-extrabold">{form.name}</div>
                  <div className="text-xs text-text-light mt-0.5">{form.category}</div>
                </div>
                <div className="font-extrabold text-primary">৳{Math.round(priceNum)}</div>
              </div>
              <p className="text-xs text-text-light mt-2 leading-relaxed">
                {form.description || "No description"}
              </p>
              <Link href={`/restaurants/${restaurantId}`} className="inline-block mt-2 text-[11px] text-primary font-semibold" onClick={onClose}>
                Preview listing page →
              </Link>
            </div>
          )}

          {/* Nav */}
          <div className="flex gap-3 mt-6 mb-4">
            {step > 0 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="flex-1 border border-line rounded-full py-3 font-semibold text-sm"
              >
                Back
              </button>
            )}
            {step < 2 ? (
              <button
                onClick={() => canStep && setStep((s) => s + 1)}
                disabled={!canStep}
                className="flex-[2] bg-primary text-white rounded-full py-3 font-semibold text-sm disabled:opacity-40 pressable"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={() => void submit()}
                disabled={busy}
                className="flex-[2] bg-primary text-white rounded-full py-3 font-semibold text-sm disabled:opacity-40 pressable"
              >
                {busy ? "Publishing…" : "Publish dish"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
