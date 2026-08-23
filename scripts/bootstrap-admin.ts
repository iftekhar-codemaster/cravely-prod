// Creates the Cravely super-admin account in Firebase Auth + Firestore.
//
//   npm run bootstrap:admin
//
// Account:
//   email:    itx.iftekhars@gmail.com  (owner)
//   password: admin123                 (must be rotated on first console login)

import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const OWNER_EMAIL = process.env.NEXT_PUBLIC_OWNER_EMAIL ?? "itx.iftekhars@gmail.com";
const INITIAL_PASSWORD = "admin123";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error("Missing NEXT_PUBLIC_FIREBASE_* env vars (.env.local).");
  process.exit(1);
}

// Auth requires the authDomain to be resolvable; use the default app init.
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

try {
  const cred = await createUserWithEmailAndPassword(
    auth,
    OWNER_EMAIL,
    INITIAL_PASSWORD,
  );
  await setDoc(doc(db, "users", cred.user.uid), {
    uid: cred.user.uid,
    email: OWNER_EMAIL,
    displayName: "Owner",
    photoURL: "",
    role: "super_admin",
    createdAt: new Date().toISOString(),
  });
  console.log(`Super admin created: ${OWNER_EMAIL} (password: ${INITIAL_PASSWORD})`);
} catch (err) {
  const code = err?.code ?? "";
  if (code === "auth/email-already-in-use") {
    console.log(`Super admin already exists: ${OWNER_EMAIL}`);
  } else {
    console.error("Bootstrap failed:", code, err?.message);
    process.exit(1);
  }
}
process.exit(0);
