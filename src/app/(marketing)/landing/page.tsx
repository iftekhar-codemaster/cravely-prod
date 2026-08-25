import type { Metadata } from "next";
import Image from "next/image";
import SmartImg from "@/components/SmartImg";
import { getAllFoods, getAllRestaurants } from "@/lib/data";
import { APP_URL, LANDING_URL } from "@/lib/site";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Cravely — Find what you crave in Thakurgaon",
  description:
    "Discover nearby restaurants, dishes, prices and ratings. Build a food package across kitchens and compare prices — all in one app.",
  alternates: { canonical: LANDING_URL },
  openGraph: {
    title: "Cravely — Find what you crave",
    description:
      "Discover nearby restaurants, dishes, prices and ratings. Build a food package across kitchens and compare prices.",
    url: LANDING_URL,
    siteName: "Cravely",
    images: [{ url: "/og-banner.png", width: 1200, height: 630 }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og-banner.png"],
    title: "Cravely — Find what you crave",
    description:
      "Discover nearby restaurants, dishes, prices and ratings. Build a food package across kitchens and compare prices.",
  },
};

const STEPS = [
  {
    icon: "fa-compass",
    title: "Discover",
    desc: "Browse every kitchen and dish in town with honest prices and ratings.",
  },
  {
    icon: "fa-box-open",
    title: "Build a package",
    desc: "Mix dishes from different restaurants into one package and see the total instantly.",
  },
  {
    icon: "fa-phone",
    title: "Order direct",
    desc: "Call or WhatsApp the kitchen directly — no middleman, no markup.",
  },
];

export default async function LandingPage() {
  const [foods, restaurants] = await Promise.all([
    getAllFoods(),
    getAllRestaurants(),
  ]);
  const topFoods = [...foods]
    .sort((a, b) => b.rating - a.rating || b.reviews - a.reviews)
    .slice(0, 6);
  const topRestaurants = [...restaurants]
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 4);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent" />
        <div className="relative max-w-5xl mx-auto px-5 pt-16 pb-20 text-center">
          <Image
            src="/icon-192.png"
            alt="Cravely logo"
            width={88}
            height={88}
            priority
            className="rounded-3xl shadow-lg mx-auto mb-6 anim-pop"
          />
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight">
            Hunger is a compass.
            <br />
            <span className="text-primary">Follow it.</span>
          </h1>
          <p className="mt-5 text-text-light text-base sm:text-lg max-w-xl mx-auto">
            Cravely shows you every kitchen, dish and price in Thakurgaon —
            so you spend less time wondering and more time eating.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <a
              href={APP_URL}
              className="pressable bg-primary text-white font-bold rounded-full px-7 py-3.5 shadow-lg shadow-primary/30"
            >
              Open Cravely — free
            </a>
          </div>
          <p className="mt-3 text-xs text-text-light">
            Works in your browser · installable as an app
          </p>

          <div className="mt-10 flex items-center justify-center gap-8 text-sm">
            <div>
              <b className="text-xl font-extrabold block">{foods.length}</b>
              <span className="text-text-light">dishes</span>
            </div>
            <div className="w-px h-8 bg-line" />
            <div>
              <b className="text-xl font-extrabold block">
                {restaurants.length}
              </b>
              <span className="text-text-light">kitchens</span>
            </div>
            <div className="w-px h-8 bg-line" />
            <div>
              <b className="text-xl font-extrabold block">৳</b>
              <span className="text-text-light">honest prices</span>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-5 py-14">
        <h2 className="text-2xl font-extrabold text-center">
          Three taps to dinner
        </h2>
        <div className="mt-8 grid sm:grid-cols-3 gap-4">
          {STEPS.map((s) => (
            <div
              key={s.title}
              className="rounded-2xl border border-line bg-card p-6 text-center shadow-[var(--shadow-card)]"
            >
              <span className="inline-flex w-11 h-11 rounded-full bg-primary/10 items-center justify-center text-primary text-lg mb-3">
                <i className={`fa-solid ${s.icon}`} aria-hidden />
              </span>
              <h3 className="font-bold">{s.title}</h3>
              <p className="mt-1 text-sm text-text-light">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Top dishes */}
      {topFoods.length > 0 && (
        <section className="max-w-5xl mx-auto px-5 py-10">
          <div className="flex items-end justify-between mb-5">
            <h2 className="text-2xl font-extrabold">Craved right now</h2>
            <a
              href={APP_URL}
              className="text-sm font-semibold text-primary pressable"
            >
              See all →
            </a>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {topFoods.map((f) => (
              <a
                key={f.id}
                href={`${APP_URL}/product/${f.id}`}
                className="group rounded-2xl border border-line bg-card overflow-hidden shadow-[var(--shadow-card)] pressable"
              >
                <SmartImg
                  src={f.image}
                  alt={f.name}
                  className="aspect-[4/3]"
                  imgClassName="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                <div className="p-3">
                  <h3 className="font-bold text-sm truncate">{f.name}</h3>
                  <p className="text-xs text-text-light truncate">
                    ৳{f.price} · ★ {f.rating}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Top kitchens */}
      {topRestaurants.length > 0 && (
        <section className="max-w-5xl mx-auto px-5 py-10 pb-16">
          <div className="flex items-end justify-between mb-5">
            <h2 className="text-2xl font-extrabold">Kitchens in town</h2>
            <a
              href={`${APP_URL}/restaurants`}
              className="text-sm font-semibold text-primary pressable"
            >
              See all →
            </a>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {topRestaurants.map((r) => (
              <a
                key={r.id}
                href={`${APP_URL}/restaurants/${r.id}`}
                className="flex gap-4 rounded-2xl border border-line bg-card p-3 shadow-[var(--shadow-card)] pressable"
              >
                <SmartImg
                  src={r.logo}
                  alt={r.name}
                  className="w-16 h-16 rounded-xl shrink-0"
                  imgClassName="w-full h-full object-cover"
                />
                <div className="min-w-0">
                  <h3 className="font-bold truncate">
                    {r.name}
                    {r.verified && (
                      <i
                        className="fa-solid fa-circle-check text-primary ml-1.5 text-xs"
                        aria-hidden
                      />
                    )}
                  </h3>
                  <p className="text-xs text-text-light truncate">
                    {r.cuisine} · ★ {r.rating} · until {r.openUntil}
                  </p>
                  <p className="text-xs text-text-light truncate mt-0.5">
                    {r.address}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Final CTA */}
      <section className="max-w-5xl mx-auto px-5 pb-20">
        <div className="rounded-3xl bg-primary text-white text-center px-6 py-12 shadow-xl shadow-primary/25">
          <h2 className="text-2xl sm:text-3xl font-extrabold">
            Tonight, eat what you actually crave.
          </h2>
          <p className="mt-2 text-white/85 text-sm">
            Free to use — no account needed to browse.
          </p>
          <a
            href={APP_URL}
            className="pressable inline-block mt-6 bg-white text-primary font-bold rounded-full px-7 py-3.5 shadow-lg"
          >
            Open Cravely
          </a>
        </div>
      </section>
    </>
  );
}
