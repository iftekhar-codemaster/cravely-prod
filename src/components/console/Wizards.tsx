"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/components/AuthProvider";
import { getDb } from "@/lib/firebase";
import { getCuisines, getFoodsByRestaurant, type Food } from "@/lib/data";
import { audit } from "@/lib/audit";
import { uploadImage } from "@/lib/storage";

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
  onAdded,
  inline,
}: {
  restaurantId: string;
  onAdded: () => void;
  inline?: boolean;
}) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [others, setOthers] = useState<Food[]>([]);
  const [pairsWith, setPairsWith] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [manualUrl, setManualUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    category: "",
    price: "",
    description: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => void getCuisines().then(setCuisines), 0);
    return () => clearTimeout(t);
  }, []);

  // Other dishes from the same kitchen — pairing candidates
  useEffect(() => {
    if (!restaurantId) return;
    const t = setTimeout(
      () => void getFoodsByRestaurant(restaurantId).then(setOthers),
      0,
    );
    return () => clearTimeout(t);
  }, [restaurantId]);

  function togglePair(id: string) {
    setPairsWith((prev) =>
      prev.includes(id)
        ? prev.filter((p) => p !== id)
        : prev.length >= 4
          ? prev
          : [...prev, id],
    );
  }

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setUploadError(null);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        if (images.length + urls.length >= 3) break;
        urls.push(await uploadImage(file, "food", restaurantId));
      }
      setImages((prev) => [...prev, ...urls].slice(0, 3));
    } catch (err) {
      console.warn(err);
      setUploadError(
        err instanceof Error
          ? `${err.message} You can paste an image URL below instead.`
          : "Upload failed. You can paste an image URL below instead.",
      );
    } finally {
      setUploading(false);
    }
  }

  function addManualUrl() {
    const url = manualUrl.trim();
    if (!url || images.length >= 3) return;
    setImages((prev) => [...prev, url].slice(0, 3));
    setManualUrl("");
  }

  const steps = ["Basics", "Details", "Review"];
  const priceNum = Number(form.price);
  const previewImage =
    images[0] ||
    `https://loremflickr.com/400/300/${encodeURIComponent(form.category || "food")}`;

  function defaultDescription(): string {
    const name = form.name.trim();
    const category = (form.category.trim() || "dish").toLowerCase();
    return `${name} — freshly prepared ${category} at its best.`;
  }

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
        image: images[0] ?? previewImage,
        images,
        pairsWith,
        description: form.description.trim() || defaultDescription(),
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

  const body = (
    <>
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

          {others.length > 0 && (
            <div>
              <p className="text-xs font-semibold mb-1">Goes well with ({pairsWith.length}/4)</p>
              <p className="text-[11px] text-text-light mb-2">
                Pick up to 4 of your other dishes to suggest together.
              </p>
              <div className="flex flex-wrap gap-2">
                {others.map((f) => {
                  const selected = pairsWith.includes(f.id);
                  const disabled = !selected && pairsWith.length >= 4;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => togglePair(f.id)}
                      disabled={disabled}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        selected
                          ? "bg-primary text-white border-primary"
                          : disabled
                            ? "border-line bg-gray-50 text-text-light opacity-50"
                            : "border-line bg-card text-text-light hover:border-primary"
                      }`}
                    >
                      {selected && <i className="fa-solid fa-check mr-1" aria-hidden />}
                      {f.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold mb-2">Photos ({images.length}/3)</p>
            {images.length > 0 && (
              <div className="flex gap-2 mb-3">
                {images.map((url, i) => (
                  <div key={`${url}-${i}`} className="relative w-20 h-20 rounded-xl overflow-hidden border border-line">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    {i === 0 && (
                      <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[9px] font-bold text-center py-0.5">
                        PRIMARY
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setImages(images.filter((_, j) => j !== i))}
                      aria-label={`Remove photo ${i + 1}`}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center"
                    >
                      <i className="fa-solid fa-xmark text-[9px]" aria-hidden />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {images.length < 3 && (
              <>
                <label
                  className={`inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-xs font-semibold cursor-pointer hover:border-primary transition-colors ${
                    uploading ? "opacity-50 pointer-events-none" : ""
                  }`}
                >
                  <i className={`fa-solid ${uploading ? "fa-spinner animate-spin" : "fa-camera"}`} aria-hidden />
                  {uploading ? "Uploading…" : "Add photo"}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => void addFiles(e.target.files)}
                    className="hidden"
                  />
                </label>
                <div className="flex gap-2 mt-2">
                  <input
                    value={manualUrl}
                    onChange={(e) => setManualUrl(e.target.value)}
                    placeholder="…or paste an image URL"
                    className={`${inputCls} py-2 text-xs`}
                  />
                  <button
                    type="button"
                    onClick={addManualUrl}
                    disabled={!manualUrl.trim()}
                    aria-label="Add image URL"
                    className="px-4 rounded-xl border border-line text-xs font-semibold text-primary disabled:opacity-40"
                  >
                    Add
                  </button>
                </div>
              </>
            )}
            {uploadError && (
              <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-primary">{uploadError}</p>
            )}
          </div>

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
          {images.length > 1 && (
            <p className="text-[11px] text-text-light mt-1">
              +{images.length - 1} more photo{images.length > 2 ? "s" : ""}
            </p>
          )}
          <Link href={`/restaurants/${restaurantId}`} className="inline-block mt-2 text-[11px] text-primary font-semibold">
            Preview listing page →
          </Link>
        </div>
      )}

      {/* Nav */}
      <div className={`flex gap-3 mt-6 ${inline ? "" : "mb-4"}`}>
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
    </>
  );

  if (inline) {
    return (
      <section className="rounded-2xl border border-line bg-card p-5 shadow-card anim-fade-up">
        <h2 className="font-extrabold text-sm mb-4">
          <i className="fa-solid fa-plus text-primary mr-2" aria-hidden />
          New dish
        </h2>
        {body}
      </section>
    );
  }

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
            onClick={onAdded}
            aria-label="Close"
            className="w-8 h-8 rounded-full bg-background text-text-light hover:text-primary transition-colors"
          >
            <i className="fa-solid fa-xmark" aria-hidden />
          </button>
        </div>

        <div className="px-5 py-4">{body}</div>
      </div>
    </div>
  );
}
