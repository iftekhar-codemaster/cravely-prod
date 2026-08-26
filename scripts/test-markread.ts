import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
} from "firebase/firestore";

const cfg = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};
const app = initializeApp(cfg);
const auth = getAuth(app);
const db = getFirestore(app);

const EMAIL = "backfill-service@cravely.space";
const PASS = "cravely-backfill-" + cfg.projectId;
try {
  await createUserWithEmailAndPassword(auth, EMAIL, PASS);
} catch {
  await signInWithEmailAndPassword(auth, EMAIL, PASS);
}
const uid = auth.currentUser!.uid;
console.log("signed in:", uid);

// ensure a proper user doc (like ensureUserProfile does)
await setDoc(doc(db, "users", uid), {
  uid,
  email: EMAIL,
  displayName: "backfill",
  photoURL: "",
  role: "user",
}, { merge: true });

// now the exact markAllRead write
try {
  await setDoc(doc(db, "users", uid), { notificationsReadAt: new Date() }, { merge: true });
  const snap = await getDoc(doc(db, "users", uid));
  console.log("WRITE OK, notificationsReadAt =", snap.data()?.notificationsReadAt);
} catch (e) {
  console.log("WRITE FAILED:", (e as Error).message);
}
process.exit(0);
