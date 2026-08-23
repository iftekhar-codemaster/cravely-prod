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
  GoogleAuthProvider,
  type User,
} from "firebase/auth";
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
    await signInWithEmailAndPassword(auth, email.trim(), password);
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
