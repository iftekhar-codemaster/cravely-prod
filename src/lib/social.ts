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

export function saveSocialLinks(links: SocialLinks): Promise<void> {
  const db = getDb();
  if (!db) return Promise.reject(new Error("Firebase is not configured."));
  return setDoc(doc(db, "systemSettings", "social"), links, { merge: true });
}
