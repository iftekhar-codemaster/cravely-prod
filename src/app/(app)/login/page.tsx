"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth, GoogleLinkNeededError } from "@/components/AuthProvider";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.9-.1-1.7-.2-2.5H12v4.8h6.5c-.3 1.5-1.1 2.8-2.4 3.6v3h3.9c2.2-2.1 3.5-5.2 3.5-8.9z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 5.9-1.1 7.9-2.8l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1C3.4 21.8 7.4 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.4 14.5c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3V6.8H1.4C.5 8.4 0 10.1 0 12s.5 3.6 1.4 5.2l4-2.7z"
      />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.3.6 4.5 1.7L20 3C17.9 1 15.2 0 12 0 7.4 0 3.4 2.2 1.4 6.8l4 3.1c.9-2.9 3.5-5.1 6.6-5.1z"
      />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="px-5 pt-12 pb-10">
          <div className="mx-auto mb-9 w-32 h-8 rounded-lg bg-gray-100 animate-pulse" />
          <div className="space-y-4">
            {[0, 1].map((i) => (
              <div key={i} className="h-12 rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/profile";

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [linkEmail, setLinkEmail] = useState<string | null>(null);
  const [linkPw, setLinkPw] = useState("");
  const [linkBusy, setLinkBusy] = useState(false);

  function friendly(code: string): string {
    if (code === "auth/invalid-credential" || code === "auth/wrong-password")
      return "Incorrect email or password.";
    if (code === "auth/email-already-in-use")
      return "That email already has an account.";
    if (code === "auth/weak-password")
      return "Password must be at least 6 characters.";
    if (code === "auth/invalid-email") return "Please enter a valid email address.";
    if (code === "auth/too-many-requests")
      return "Too many attempts. Please wait a moment and try again.";
    return "Something went wrong. Please try again.";
  }

  async function handleLink(e: FormEvent) {
    e.preventDefault();
    if (!linkEmail) return;
    setError(null);
    setLinkBusy(true);
    try {
      await signIn(linkEmail, linkPw); // also consumes + links the pending Google credential
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(friendly((err as { code?: string }).code ?? ""));
    } finally {
      setLinkBusy(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "signin") await signIn(email, password);
      else await signUp(name.trim(), email.trim(), password);
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(friendly((err as { code?: string }).code ?? ""));
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setBusy(true);
    try {
      await signInWithGoogle();
      router.push(next);
      router.refresh();
    } catch (err) {
      if (err instanceof GoogleLinkNeededError) {
        setLinkEmail(err.email || email);
        setError(null);
      } else {
        setError(
          err instanceof Error
            ? err.message
            : friendly((err as { code?: string }).code ?? ""),
        );
      }
    } finally {
      setBusy(false);
    }
  }

  if (linkEmail) {
    return (
      <div className="px-5 pt-12 pb-10">
        <div className="anim-fade-up">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-xl mb-4">
            <i className="fa-brands fa-google" aria-hidden />
          </div>
          <h1 className="text-xl font-extrabold leading-snug">Connect Google</h1>
          <p className="text-sm text-text-light mt-2 leading-relaxed">
            <b>{linkEmail}</b> already has a Cravely account with a password.
            Confirm your password once — Google will be connected to the same
            account so both sign-in methods work from now on.
          </p>
        </div>

        <form onSubmit={handleLink} className="space-y-4 mt-6">
          <input
            type="password"
            required
            placeholder="Your account password"
            value={linkPw}
            onChange={(e) => setLinkPw(e.target.value)}
            autoComplete="current-password"
            className="w-full rounded-xl border border-line bg-card px-4 py-3 text-sm outline-none focus:border-primary transition-colors"
          />
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-primary">{error}</p>
          )}
          <button
            type="submit"
            disabled={linkBusy}
            className="w-full bg-primary py-3 font-semibold text-white rounded-full disabled:opacity-50 pressable"
          >
            {linkBusy ? "Linking…" : "Confirm & connect Google"}
          </button>
          <button
            type="button"
            onClick={() => {
              setLinkEmail(null);
              setLinkPw("");
              setError(null);
            }}
            className="w-full text-center text-xs text-text-light hover:text-primary transition-colors"
          >
            ← Back to sign in
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="px-5 pt-12 pb-10">
      <div className="mb-9 text-center">
        <Image
          src="/icon-192.png"
          alt="Cravely logo"
          width={72}
          height={72}
          priority
          className="rounded-2xl shadow-md mx-auto mb-4 anim-pop"
        />
        <h1 className="text-3xl font-extrabold">
          <span className="text-primary">Crave</span>ly
        </h1>
        <p className="mt-2 text-sm text-text-light">
          {mode === "signin"
            ? "Welcome back — sign in to continue"
            : "Create your account to get started"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "signup" && (
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            className="w-full rounded-xl border border-line bg-card px-4 py-3 text-sm outline-none focus:border-primary transition-colors"
          />
        )}
        <input
          type="email"
          required
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          className="w-full rounded-xl border border-line bg-card px-4 py-3 text-sm outline-none focus:border-primary transition-colors"
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          className="w-full rounded-xl border border-line bg-card px-4 py-3 text-sm outline-none focus:border-primary transition-colors"
        />

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-primary">{error}</p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full bg-primary py-3 font-semibold text-white rounded-full transition-all enabled:hover:shadow-[0_4px_10px_rgba(255,71,87,0.3)] disabled:opacity-50"
        >
          {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <span className="flex-1 h-px bg-line" />
        <span className="text-[11px] uppercase tracking-wide text-text-light">or</span>
        <span className="flex-1 h-px bg-line" />
      </div>

      <button
        onClick={() => void handleGoogle()}
        disabled={busy}
        className="w-full flex items-center justify-center gap-3 border border-line bg-card py-3 rounded-full font-semibold text-sm hover:border-gray-300 transition-colors disabled:opacity-50"
      >
        <GoogleIcon />
        Continue with Google
      </button>

      <button
        onClick={() => {
          setMode(mode === "signin" ? "signup" : "signin");
          setError(null);
        }}
        className="mt-5 w-full text-center text-sm text-text-light hover:text-primary transition-colors"
      >
        {mode === "signin" ? (
          <>
            New here?{" "}
            <span className="font-semibold text-primary">Create an account</span>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <span className="font-semibold text-primary">Sign in</span>
          </>
        )}
      </button>

      <Link
        href="/"
        className="mt-8 block text-center text-xs text-text-light hover:text-primary transition-colors"
      >
        Continue browsing as guest →
      </Link>

      {/* Restaurant owners */}
      <p className="mt-6 text-center text-[11px] text-text-light">
        Own a restaurant?{" "}
        <Link href="/console/restaurant" className="font-semibold text-primary">
          Apply to list it
        </Link>
      </p>
    </div>
  );
}
