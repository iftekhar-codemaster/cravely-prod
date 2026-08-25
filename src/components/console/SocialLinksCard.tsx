"use client";

import { useEffect, useState } from "react";
import { getSocialLinks, saveSocialLinks, type SocialLinks } from "@/lib/social";

const SOCIAL_FIELDS: { key: keyof SocialLinks; label: string; placeholder: string }[] = [
  { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/…" },
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/…" },
  { key: "twitter", label: "X / Twitter", placeholder: "https://x.com/…" },
  { key: "whatsapp", label: "WhatsApp", placeholder: "8801XXXXXXXXX or https://wa.me/…" },
];

/** Footer social links — super admin only writes (systemSettings rules); admins read-only. */
export default function SocialLinksCard({ canEdit }: { canEdit: boolean }) {
  const [links, setLinks] = useState<SocialLinks>({});
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getSocialLinks().then((l) => {
      setLinks(l);
      setLoaded(true);
    });
  }, []);

  async function save() {
    setError(null);
    setBusy(true);
    try {
      await saveSocialLinks({
        facebook: links.facebook?.trim() || undefined,
        instagram: links.instagram?.trim() || undefined,
        twitter: links.twitter?.trim() || undefined,
        whatsapp: links.whatsapp?.trim() || undefined,
      });
      setSaved(true);
    } catch {
      setError("Could not save. Only super admins can update social links.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-10 rounded-xl border border-line bg-card p-5 text-left anim-fade-up">
      <h2 className="font-bold text-sm flex items-center gap-2">
        <i className="fa-solid fa-share-nodes text-primary" aria-hidden />
        Social links
      </h2>
      <p className="text-xs text-text-light mt-1 mb-4 leading-relaxed">
        Shown in the app footer. Leave a field empty to hide that icon.
      </p>
      {loaded && (
        <div className="space-y-3">
          {SOCIAL_FIELDS.map(({ key, label, placeholder }) => (
            <label key={key} className="block">
              <span className="block text-[11px] font-semibold text-text-light mb-1">{label}</span>
              <input
                value={links[key] ?? ""}
                onChange={(e) => {
                  setLinks({ ...links, [key]: e.target.value });
                  setSaved(false);
                }}
                placeholder={placeholder}
                disabled={!canEdit}
                className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-primary disabled:bg-gray-50 disabled:text-text-light"
              />
            </label>
          ))}
          {canEdit ? (
            <>
              <button
                onClick={() => void save()}
                disabled={busy}
                className="w-full bg-primary text-white py-2.5 rounded-full font-semibold text-sm disabled:opacity-50 pressable"
              >
                {busy ? "Saving…" : saved ? "Saved ✓" : "Save social links"}
              </button>
              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-primary">{error}</p>
              )}
            </>
          ) : (
            <p className="text-[11px] text-text-light bg-gray-50 rounded-lg px-3 py-2">
              <i className="fa-solid fa-lock mr-1" aria-hidden />
              Only a Super Admin can edit these.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
