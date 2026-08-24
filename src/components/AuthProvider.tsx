"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as firebaseSignOut,
  signInWithPopup,
  linkWithPopup,
  GoogleAuthProvider,
  linkWithCredential,
  fetchSignInMethodsForEmail,
  type User,
  type AuthCredential,
} from "firebase/auth";
import type { FirebaseError } from "firebase/app";
import { getFirebaseAuth } from "@/lib/firebase";
import {
  ensureUserProfile,
  OWNER_EMAIL,
  type UserProfile,
} from "@/lib/user";

type AuthContextValue = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** Thrown when Google sign-in hits an existing email/password account. */
export class GoogleLinkNeededError extends Error {
  email: string;
  constructor(email: string) {
    super(
      "An account with this email already exists. Enter your password to connect Google to it.",
    );
    this.email = email;
  }
}

// Pending Google credential while the user completes the password-link step.
let pendingGoogleCredential: AuthCredential | null = null;
export function consumePendingGoogleCredential(): AuthCredential | null {
  const c = pendingGoogleCredential;
  pendingGoogleCredential = null;
  return c;
}

/** Links the signed-in user to Google (popup). */
export async function connectGoogle(user: User): Promise<void> {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Firebase is not configured.");
  try {
    await linkWithPopup(user, new GoogleAuthProvider());
  } catch (err) {
    const code = (err as { code?: string }).code ?? "";
    if (code === "auth/credential-already-in-use") {
      // Google identity is already attached to another account — nothing to do.
      throw new Error("This Google account is already connected to another Cravely account.");
    }
    if (code === "auth/popup-closed-by-user") return;
    if (code === "auth/requires-recent-login") {
      throw new Error("Please sign out and back in, then try connecting Google again.");
    }
    throw err;
  }
}

export function googleProviderData(user: User): boolean {
  return user.providerData.some((p) => p.providerId === "google.com");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  // Firebase auth resolves asynchronously on the client; start in a loading
  // state only when auth is actually available (avoids sync setState).
  const [loading, setLoading] = useState(
    () => typeof window !== "undefined" && Boolean(getFirebaseAuth()),
  );

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) setProfile(null);
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!user || profile?.uid === user.uid) return;
    let alive = true;
    ensureUserProfile(user)
      .then((p) => alive && setProfile(p))
      .catch((e) => console.warn("[cravely] profile load failed:", e));
    return () => {
      alive = false;
    };
  }, [user, profile]);

  async function refreshProfile() {
    if (user) setProfile(await ensureUserProfile(user));
  }

  async function signIn(email: string, password: string) {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error("Firebase is not configured.");
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    // If the user just verified ownership via password to link Google, attach it.
    const pending = consumePendingGoogleCredential();
    if (pending) {
      try {
        await linkWithCredential(cred.user, pending);
      } catch (err) {
        console.warn("[cravely] google link failed:", err);
      }
    }
  }

  async function signUp(name: string, email: string, password: string) {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error("Firebase is not configured.");
    if (email.trim().toLowerCase() === OWNER_EMAIL.toLowerCase()) {
      throw new Error("This email is reserved.");
    }
    const cred = await createUserWithEmailAndPassword(
      auth,
      email.trim(),
      password,
    );
    if (name) await updateProfile(cred.user, { displayName: name });
    setUser({ ...cred.user });
    setProfile(await ensureUserProfile(cred.user));
  }

  async function signInWithGoogle() {
    const auth = getFirebaseAuth();
    if (!auth) throw new Error("Firebase is not configured.");
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err) {
      const code = (err as { code?: string }).code ?? "";
      if (
        code === "auth/configuration-not-found" ||
        code === "auth/operation-not-allowed" ||
        code === "auth/unauthorized-domain"
      ) {
        throw new Error(
          "Google sign-in isn't enabled yet. Enable the Google provider in Firebase Console → Authentication → Sign-in method.",
        );
      }
      if (code === "auth/popup-closed-by-user") return;
      if (code === "auth/account-exists-with-different-credential") {
        // Same email already has a password account — link instead of duplicating.
        const cred = GoogleAuthProvider.credentialFromError(err as unknown as FirebaseError);
        const email =
          (err as { customData?: { email?: string } }).customData?.email ?? "";
        if (cred) pendingGoogleCredential = cred;
        if (email) {
          try {
            const methods = await fetchSignInMethodsForEmail(auth, email);
            if (!methods.includes("password")) {
              // No password account — link the credential to a fresh sign-in.
              pendingGoogleCredential = null;
            }
          } catch {
            /* ignore — assume password flow */
          }
        }
        throw new GoogleLinkNeededError(email);
      }
      throw err;
    }
  }

  async function signOut() {
    const auth = getFirebaseAuth();
    if (!auth) return;
    setProfile(null);
    await firebaseSignOut(auth);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
