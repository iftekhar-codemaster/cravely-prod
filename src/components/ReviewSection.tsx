"use client";

import { useState } from "react";
import Link from "next/link";
import { getFirebaseAuth } from "@/lib/firebase";
import { submitReview, type ReviewDoc } from "@/lib/data";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

const AVATAR_COLORS = [
  "bg-rose-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-sky-500",
  "bg-violet-500",
];

function avatarColor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 997;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function timeAgo(createdAt: unknown) {
  const ts = (createdAt as { toDate?: () => Date } | undefined)?.toDate?.();
  if (!ts) return "";
  const s = Math.floor((Date.now() - ts.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 2592000) return `${Math.floor(s / 86400)}d ago`;
  return ts.toLocaleDateString();
}

function Stars({ value }: { value: number }) {
  return (
    <span className="text-[#ffa502]">
      {[1, 2, 3, 4, 5].map((i) => (
        <i
          key={i}
          className={`fa-${i <= value ? "solid" : "regular"} fa-star text-xs`}
          aria-hidden
        />
      ))}
    </span>
  );
}

export default function ReviewSection({
  foodId,
  initialReviews,
}: {
  foodId: string;
  initialReviews: ReviewDoc[];
}) {
  const [reviews, setReviews] = useState(initialReviews);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const auth = getFirebaseAuth();
  const user = auth?.currentUser ?? null;

  const alreadyReviewed =
    user != null && reviews.some((r) => r.authorId === user.uid);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || rating < 1 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const id = await submitReview({
        foodId,
        authorId: user.uid,
        authorName: anonymous
          ? "Anonymous"
          : user.displayName || user.email?.split("@")[0] || "Foodie",
        rating,
        text,
      });
      if (!id) throw new Error("Reviews are not available right now.");
      const shownName = anonymous
        ? "Anonymous"
        : user.displayName || user.email?.split("@")[0] || "Foodie";
      setReviews((prev) => [
        {
          id,
          foodId,
          authorId: user.uid,
          author: shownName,
          rating,
          text: text.trim().slice(0, 1000),
          createdAt: { toDate: () => new Date() },
        },
        ...prev,
      ]);
      setText("");
      setRating(0);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not post review.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="p-5 border-b border-line">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">Reviews</h2>
        {reviews.length > 0 && (
          <span className="text-sm font-bold text-[#ffa502] flex items-center gap-1">
            <i className="fa-solid fa-star fill-current" aria-hidden />{" "}
            {(
              reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
            ).toFixed(1)}{" "}
            <span className="text-text-light font-normal">({reviews.length})</span>
          </span>
        )}
      </div>

      {reviews.length === 0 && (
        <p className="text-sm text-text-light mb-4">
          No reviews yet — be the first to rate this dish.
        </p>
      )}

      <div className="space-y-3">
        {reviews.map((review) => (
          <div key={review.id} className="bg-background p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`w-6 h-6 rounded-full ${avatarColor(review.author)} text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0`}
              >
                {initials(review.author)}
              </span>
              <span className="text-sm font-semibold text-text-dark">
                {review.author}
              </span>
              <Stars value={review.rating} />
              <span className="text-xs text-text-light ml-auto">
                {timeAgo(review.createdAt)}
              </span>
            </div>
            {review.text && (
              <p className="text-sm text-text-light">{review.text}</p>
            )}
          </div>
        ))}
      </div>

      {!user ? (
        <p className="text-sm text-text-light mt-4">
          <Link href="/login" className="text-primary font-semibold">
            Sign in
          </Link>{" "}
          to rate this dish.
        </p>
      ) : alreadyReviewed ? (
        <p className="text-sm text-text-light mt-4">
          You reviewed this dish — thanks for the feedback!
        </p>
      ) : done ? (
        <p className="text-sm text-green-600 mt-4">
          Review posted. It&apos;s live for everyone now.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-5">
          <div className="flex items-center gap-1 mb-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setRating(i)}
                aria-label={`Rate ${i} star${i > 1 ? "s" : ""}`}
                className="pressable text-xl text-[#ffa502]"
              >
                <i className={`fa-${i <= rating ? "solid" : "regular"} fa-star`} aria-hidden />
              </button>
            ))}
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="How was it? (optional)"
            className="w-full rounded-xl border border-line bg-card px-4 py-3 text-sm outline-none focus:border-primary transition-colors resize-none"
          />
          <label className="flex items-center gap-2 text-xs text-text-light select-none">
            <input
              type="checkbox"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
              className="accent-primary w-3.5 h-3.5"
            />
            Post as Anonymous
          </label>
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          <button
            type="submit"
            disabled={rating < 1 || busy}
            className="pressable mt-2 bg-primary disabled:bg-gray-300 text-white font-bold text-sm rounded-full px-5 py-2.5 shadow-md"
          >
            {busy ? "Posting…" : "Post review"}
          </button>
        </form>
      )}
    </section>
  );
}
