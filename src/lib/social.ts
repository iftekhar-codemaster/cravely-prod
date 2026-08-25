// Social links shown in the consumer app footer. Stored as a single
// Firestore doc (systemSettings/social) — super admins write it via
// /console/admin/setup; reads are allowed for any admin per rules.
import { doc, getDoc, setDoc } from "firebase/firestore";
import { getDb } from "./firebase";

export type SocialLinks = {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  whatsapp?: string;
};

export async function getSocialLinks(): Promise<SocialLinks> {
  const db = getDb();
  if (!db) return {};
  try {
    const snap = await getDoc(doc(db, "systemSettings", "social"));
    return (snap.data() as SocialLinks | undefined) ?? {};
  } catch (err) {
    console.warn("[cravely] Failed to load social links:", err);
    return {};
  }
}

export async function saveSocialLinks(links: SocialLinks): Promise<void> {
  const db = getDb();
  if (!db) return Promise.reject(new Error("Firebase is not configured."));
  // Firestore rejects undefined field values — include only filled fields.
  const clean: SocialLinks = {};
  for (const [k, v] of Object.entries(links)) {
    if (typeof v === "string" && v.trim()) clean[k as keyof SocialLinks] = v.trim();
  }
  return setDoc(doc(db, "systemSettings", "social"), clean, { merge: true });
}
