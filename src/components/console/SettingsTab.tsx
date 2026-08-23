"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { useAuth } from "@/components/AuthProvider";
import { uploadImage } from "@/lib/storage";
import SmartImg from "@/components/SmartImg";
import type { Restaurant } from "@/lib/data";

const inputCls =
  "w-full rounded-xl border border-line bg-card px-4 py-3 text-sm outline-none focus:border-primary transition-colors";

const fileBtnCls =
  "inline-flex items-center gap-2 rounded-full border border-line bg-background px-4 py-2 text-xs font-semibold cursor-pointer hover:border-primary transition-colors";

function SavedNotice({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="text-xs font-semibold text-green-600">
      <i className="fa-solid fa-check mr-1" aria-hidden />
      Saved
    </span>
  );
}

export default function SettingsTab({ restaurantId }: { restaurantId: string }) {
  const [rest, setRest] = useState<Restaurant | null>(null);
  const [missing, setMissing] = useState(false);

  const load = useCallback(async () => {
    const db = getDb()!;
    const snap = await getDoc(doc(db, "restaurants", restaurantId));
    if (!snap.exists()) {
      setMissing(true);
      return;
    }
    setRest({ id: snap.id, ...(snap.data() as Omit<Restaurant, "id">) });
  }, [restaurantId]);

  useEffect(() => {
    const t = setTimeout(() => void load().catch(() => setMissing(true)), 0);
    return () => clearTimeout(t);
  }, [load]);

  if (missing) {
    return (
      <p className="text-sm text-text-light text-center py-10 anim-fade-up">
        Restaurant profile not found yet.
      </p>
    );
  }

  if (!rest) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-32 rounded-2xl skel" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      <IdentitySection rest={rest} restaurantId={restaurantId} onReload={load} />
      <HoursSection rest={rest} restaurantId={restaurantId} />
      <ContactsSection rest={rest} restaurantId={restaurantId} />
      <SecuritySection />
    </div>
  );
}

/* ---------------- Identity ---------------- */

function IdentitySection({
  rest,
  restaurantId,
  onReload,
}: {
  rest: Restaurant;
  restaurantId: string;
  onReload: () => Promise<void>;
}) {
  const [name, setName] = useState(rest.name);
  const [cuisine, setCuisine] = useState(rest.cuisine);
  const [description, setDescription] = useState(rest.description ?? "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<"logo" | "cover" | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [manualLogo, setManualLogo] = useState("");
  const [manualCover, setManualCover] = useState("");

  async function saveIdentity() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await updateDoc(doc(getDb()!, "restaurants", restaurantId), {
        name: name.trim(),
        cuisine: cuisine.trim(),
        description: description.trim(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      await onReload();
    } catch (err) {
      console.warn(err);
      setUploadError("Could not save identity details.");
    } finally {
      setBusy(false);
    }
  }

  async function handleImage(kind: "logo" | "cover", file: File | undefined) {
    if (!file) return;
    setUploading(kind);
    setUploadError(null);
    try {
      const url = await uploadImage(file, kind, restaurantId);
      await updateDoc(doc(getDb()!, "restaurants", restaurantId), {
        [kind]: url,
      });
      await onReload();
    } catch (err) {
      console.warn(err);
      setUploadError(
        err instanceof Error
          ? `${err.message} You can paste an image URL below instead.`
          : "Upload failed. You can paste an image URL below instead.",
      );
    } finally {
      setUploading(null);
      if (kind === "logo" && logoInputRef.current) logoInputRef.current.value = "";
      if (coverInputRef.current && kind === "cover") coverInputRef.current.value = "";
    }
  }

  async function setManualUrl(kind: "logo" | "cover") {
    const url = (kind === "logo" ? manualLogo : manualCover).trim();
    if (!url) return;
    setUploading(kind);
    setUploadError(null);
    try {
      await updateDoc(doc(getDb()!, "restaurants", restaurantId), { [kind]: url });
      if (kind === "logo") setManualLogo("");
      else setManualCover("");
      await onReload();
    } catch (err) {
      console.warn(err);
      setUploadError("Could not save the URL.");
    } finally {
      setUploading(null);
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-card p-5 shadow-card anim-fade-up">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-sm">
          <i className="fa-solid fa-store text-primary mr-2" aria-hidden />
          Identity
        </h2>
        <SavedNotice show={saved} />
      </div>

      <div className="space-y-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Restaurant name"
          className={inputCls}
        />
        <input
          value={cuisine}
          onChange={(e) => setCuisine(e.target.value)}
          placeholder="Cuisine"
          className={inputCls}
        />
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Short description shown on your listing"
          className={`${inputCls} resize-none`}
        />

        {/* Logo */}
        <div>
          <p className="text-xs font-semibold mb-2">Logo</p>
          <div className="flex items-center gap-3">
            <SmartImg
              src={rest.logo}
              alt=""
              eager
              className="w-14 h-14 rounded-xl bg-gray-100 flex-shrink-0"
              imgClassName="w-full h-full object-cover"
            />
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => void handleImage("logo", e.target.files?.[0])}
              className="hidden"
              id="logo-upload"
            />
            <label htmlFor="logo-upload" className={`${fileBtnCls} ${uploading === "logo" ? "opacity-50 pointer-events-none" : ""}`}>
              {uploading === "logo" ? (
                <>
                  <i className="fa-solid fa-spinner animate-spin" aria-hidden /> Uploading…
                </>
              ) : (
                <>
                  <i className="fa-solid fa-upload" aria-hidden /> Upload logo
                </>
              )}
            </label>
          </div>
          <input
            value={manualLogo}
            onChange={(e) => setManualLogo(e.target.value)}
            placeholder="…or paste a logo image URL"
            className={`${inputCls} mt-2 text-xs py-2`}
          />
          {manualLogo.trim() && (
            <button
              onClick={() => void setManualUrl("logo")}
              className="mt-1.5 text-xs font-semibold text-primary"
            >
              Save logo URL
            </button>
          )}
        </div>

        {/* Cover */}
        <div>
          <p className="text-xs font-semibold mb-2">Cover photo</p>
          <SmartImg
            src={rest.cover || rest.image}
            alt=""
            eager
            className="w-full h-32 rounded-xl bg-gray-100"
            imgClassName="w-full h-full object-cover"
          />
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => void handleImage("cover", e.target.files?.[0])}
            className="hidden"
            id="cover-upload"
          />
          <label
            htmlFor="cover-upload"
            className={`${fileBtnCls} mt-2 ${uploading === "cover" ? "opacity-50 pointer-events-none" : ""}`}
          >
            {uploading === "cover" ? (
              <>
                <i className="fa-solid fa-spinner animate-spin" aria-hidden /> Uploading…
              </>
            ) : (
              <>
                <i className="fa-solid fa-upload" aria-hidden /> Upload cover
              </>
            )}
          </label>
          <input
            value={manualCover}
            onChange={(e) => setManualCover(e.target.value)}
            placeholder="…or paste a cover image URL"
            className={`${inputCls} mt-2 text-xs py-2`}
          />
          {manualCover.trim() && (
            <button
              onClick={() => void setManualUrl("cover")}
              className="mt-1.5 text-xs font-semibold text-primary"
            >
              Save cover URL
            </button>
          )}
        </div>

        {uploadError && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-primary">{uploadError}</p>
        )}

        <button
          onClick={() => void saveIdentity()}
          disabled={busy}
          className="w-full bg-primary text-white rounded-full py-3 font-semibold text-sm disabled:opacity-40 pressable"
        >
          {busy ? "Saving…" : "Save identity"}
        </button>
      </div>
    </section>
  );
}

/* ---------------- Hours ---------------- */

function HoursSection({
  rest,
  restaurantId,
}: {
  rest: Restaurant;
  restaurantId: string;
}) {
  const [openFrom, setOpenFrom] = useState(rest.openFrom ?? "");
  const [openUntil, setOpenUntil] = useState(rest.openUntil ?? "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await updateDoc(doc(getDb()!, "restaurants", restaurantId), {
        openFrom: openFrom || null,
        openUntil: openUntil || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.warn(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-card p-5 shadow-card anim-fade-up">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-sm">
          <i className="fa-solid fa-clock text-primary mr-2" aria-hidden />
          Hours
        </h2>
        <SavedNotice show={saved} />
      </div>
      <div className="flex items-center gap-3 mb-3">
        <input
          type="time"
          value={openFrom}
          onChange={(e) => setOpenFrom(e.target.value)}
          className={inputCls}
          aria-label="Opens at"
        />
        <span className="text-text-light text-xs font-semibold">to</span>
        <input
          type="time"
          value={openUntil}
          onChange={(e) => setOpenUntil(e.target.value)}
          className={inputCls}
          aria-label="Open until"
        />
      </div>
      <button
        onClick={() => void save()}
        disabled={busy}
        className="w-full bg-primary text-white rounded-full py-3 font-semibold text-sm disabled:opacity-40 pressable"
      >
        {busy ? "Saving…" : "Save hours"}
      </button>
    </section>
  );
}

/* ---------------- Contacts ---------------- */

function ContactsSection({
  rest,
  restaurantId,
}: {
  rest: Restaurant;
  restaurantId: string;
}) {
  const [phone, setPhone] = useState(rest.phone ?? "");
  const [whatsapp, setWhatsapp] = useState(rest.whatsapp ?? "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await updateDoc(doc(getDb()!, "restaurants", restaurantId), {
        phone: phone.trim(),
        whatsapp: whatsapp.trim(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.warn(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-card p-5 shadow-card anim-fade-up">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-sm">
          <i className="fa-solid fa-phone text-primary mr-2" aria-hidden />
          Contacts
        </h2>
        <SavedNotice show={saved} />
      </div>
      <div className="space-y-3 mb-3">
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone number"
          className={inputCls}
        />
        <input
          type="tel"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          placeholder="WhatsApp number"
          className={inputCls}
        />
      </div>
      <button
        onClick={() => void save()}
        disabled={busy}
        className="w-full bg-primary text-white rounded-full py-3 font-semibold text-sm disabled:opacity-40 pressable"
      >
        {busy ? "Saving…" : "Save contacts"}
      </button>
    </section>
  );
}

/* ---------------- Security ---------------- */

function SecuritySection() {
  const { user } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function changePassword() {
    setError(null);
    if (next.length < 8) return setError("New password must be at least 8 characters.");
    if (next !== confirm) return setError("Passwords do not match.");
    if (!user?.email) return setError("Not signed in with email/password.");
    setBusy(true);
    try {
      const cred = EmailAuthProvider.credential(user.email, current);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, next);
      setCurrent("");
      setNext("");
      setConfirm("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Current password is incorrect.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-card p-5 shadow-card anim-fade-up">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-sm">
          <i className="fa-solid fa-shield-halved text-primary mr-2" aria-hidden />
          Security
        </h2>
        <SavedNotice show={saved} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void changePassword();
        }}
        className="space-y-3"
      >
        <input
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          placeholder="Current password"
          autoComplete="current-password"
          required
          className={inputCls}
        />
        <input
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          placeholder="New password (min 8 characters)"
          autoComplete="new-password"
          required
          minLength={8}
          className={inputCls}
        />
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repeat new password"
          autoComplete="new-password"
          required
          minLength={8}
          className={inputCls}
        />
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-primary">{error}</p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="w-full bg-primary text-white rounded-full py-3 font-semibold text-sm disabled:opacity-40 pressable"
        >
          {busy ? "Updating…" : "Change password"}
        </button>
      </form>
    </section>
  );
}

