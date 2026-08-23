import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getDb, getFirebaseAuth, isFirebaseConfigured } from "./firebase";

export type AuditAction =
  | "auth.signin"
  | "user.role.change"
  | "user.perms"
  | "application.decision"
  | "restaurant.verified"
  | "restaurant.location"
  | "food.publish"
  | "food.delete"
  | "story.publish"
  | "story.delete"
  | "security.passkey.enroll"
  | "security.passkey.remove"
  | "security.passkey.reset"
  | "security.ip.add"
  | "security.ip.remove"
  | "security.recovery.toggled"
  | "db.doc.update"
  | "db.doc.delete"
  | "impersonation.start"
  | "impersonation.stop";

/**
 * Append-only audit trail. Fire-and-forget: never breaks the calling flow.
 * Rules: any signed-in user may create; only admins may read; nobody updates/deletes.
 */
export async function audit(
  action: AuditAction,
  target?: string,
  details?: Record<string, unknown>,
): Promise<void> {
  try {
    if (!isFirebaseConfigured) return;
    const db = getDb();
    const auth = getFirebaseAuth();
    if (!db || !auth?.currentUser) return;
    await addDoc(collection(db, "auditLogs"), {
      actorUid: auth.currentUser.uid,
      actorEmail: auth.currentUser.email ?? "",
      action,
      target: target ?? "",
      details: details ?? {},
      at: serverTimestamp(),
    });
  } catch (err) {
    console.warn("[cravely] audit write failed:", err);
  }
}
