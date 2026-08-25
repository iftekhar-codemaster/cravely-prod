import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CloseButton from "@/components/CloseButton";
import SmartImg from "@/components/SmartImg";
import FoodCard from "@/components/FoodCard";
import {
  getRestaurant,
  getFoodsByRestaurant,
} from "@/lib/data";
import { APP_URL } from "@/lib/site";

/** Tolerant time parser: accepts "18:30" (24h) or "6:30 PM" style. Returns minutes since midnight, or undefined. */
function parseTime(value?: string): number | undefined {
  if (!value) return undefined;
  const m = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!m) return undefined;
  let h = Number.parseInt(m[1], 10);
  const min = Number.parseInt(m[2], 10);
  const ap = m[3]?.toUpperCase();
  if (ap === "PM" && h < 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  if (h > 23 || min > 59) return undefined;
  return h * 60 + min;
}

/** Returns true/false when both times parse, otherwise undefined (unknown). */
function isOpenNow(openFrom?: string, openUntil?: string): boolean | undefined {
  const from = parseTime(openFrom);
  const until = parseTime(openUntil);
  if (from === undefined || until === undefined) return undefined;
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes();
  if (until <= from) return cur >= from || cur < until; // spans midnight
  return cur >= from && cur < until;
}

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const restaurant = await getRestaurant(decodeURIComponent(id));
  if (!restaurant) return { title: "Restaurant not found" };
  const description =
    restaurant.description ??
    `${restaurant.cuisine} in ${restaurant.address} — rated ${restaurant.rating} on Cravely. See the menu, prices and opening hours.`;
  return {
    title: `${restaurant.name} — ${restaurant.cuisine}`,
    description,
    alternates: { canonical: `${APP_URL}/restaurants/${restaurant.id}` },
    openGraph: {
      title: restaurant.name,
      description,
      url: `${APP_URL}/restaurants/${restaurant.id}`,
      images: [{ url: restaurant.image }],
      type: "profile",
    },
  };
}

export default async function RestaurantDetailPage({ params }: Props) {
  const { id } = await params;
  const restaurantId = decodeURIComponent(id);
  const restaurant = await getRestaurant(restaurantId);
  if (!restaurant) notFound();
  const menu = await getFoodsByRestaurant(restaurantId);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: restaurant.name,
    image: [restaurant.image, restaurant.cover].filter(Boolean),
    logo: restaurant.logo,
    description: restaurant.description,
    servesCuisine: restaurant.cuisine,
    telephone: restaurant.phone,
    priceRange: "৳",
    address: {
      "@type": "PostalAddress",
      streetAddress: restaurant.address,
      addressLocality: "Thakurgaon",
      addressCountry: "BD",
    },
    ...(restaurant.lat && restaurant.lng
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: restaurant.lat,
            longitude: restaurant.lng,
          },
        }
      : {}),
    ...(restaurant.rating > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: restaurant.rating,
            reviewCount: restaurant.reviews,
          },
        }
      : {}),
    hasMenu: {
      "@type": "Menu",
      url: `${APP_URL}/restaurants/${restaurant.id}`,
      hasMenuSection: menu.length
        ? [
            {
              "@type": "MenuSection",
              name: "Menu",
              hasMenuItem: menu.map((f) => ({
                "@type": "MenuItem",
                name: f.name,
                description: f.description,
                image: f.image,
                offers: {
                  "@type": "Offer",
                  price: f.price,
                  priceCurrency: "BDT",
                },
              })),
            },
          ]
        : undefined,
    },
  };

  return (
    <div className="relative pb-6">
      <CloseButton />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <div className="relative h-48 bg-gray-200 anim-fade-up">
        <SmartImg
          src={restaurant.image}
          alt={restaurant.name}
          eager
          className="w-full h-full"
          imgClassName="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute bottom-3 left-4 right-4 text-white">
          <h1 className="text-2xl font-extrabold drop-shadow-lg flex items-center gap-2">
            {restaurant.name}
            {restaurant.verified && (
              <i
                className="fa-solid fa-circle-check text-primary text-base"
                title="Verified"
                aria-label="Verified"
              />
            )}
          </h1>
        </div>
      </div>

      {restaurant.cover && (
        <div className="px-5 pt-4 anim-fade-up">
          <SmartImg
            src={restaurant.cover}
            alt={`${restaurant.name} cover`}
            className="h-28 rounded-xl overflow-hidden w-full"
            imgClassName="w-full h-full object-cover"
          />
        </div>
      )}

      <section
        className="p-5 border-b border-line anim-fade-up"
        style={{ animationDelay: "70ms" }}
      >
        <p className="text-sm text-text-light">
          {restaurant.cuisine} · {restaurant.address}
        </p>
        {restaurant.description && (
          <p className="text-sm text-text-light mt-2">{restaurant.description}</p>
        )}
        <div className="flex gap-4 mt-3 text-sm flex-wrap items-center">
          <span className="text-[#ffa502] font-semibold">
            <i className="fa-solid fa-star mr-1" aria-hidden />
            {restaurant.rating}
          </span>
          <span className="text-text-light">({restaurant.reviews}+ reviews)</span>
          <span className="text-text-light">
            <i className="fa-solid fa-location-dot mr-1" aria-hidden />
            {restaurant.distanceKm} km
          </span>
          <span className="text-text-light">Open until {restaurant.openUntil}</span>
          {isOpenNow(restaurant.openFrom, restaurant.openUntil) === true && (
            <span className="inline-flex items-center gap-1 rounded-xl bg-card border border-line px-2 py-0.5 text-xs font-semibold text-green-600">
              <i className="fa-solid fa-circle text-[6px]" aria-hidden />
              Open now
            </span>
          )}
          {isOpenNow(restaurant.openFrom, restaurant.openUntil) === false && (
            <span className="inline-flex items-center gap-1 rounded-xl bg-card border border-line px-2 py-0.5 text-xs font-semibold text-red-500">
              <i className="fa-solid fa-circle text-[6px]" aria-hidden />
              Closed
            </span>
          )}
        </div>
        {(restaurant.phone || restaurant.whatsapp) && (
          <div className="flex gap-2 mt-4">
            {restaurant.phone && (
              <a
                href={`tel:${restaurant.phone}`}
                className="pressable inline-flex items-center gap-1.5 rounded-xl border border-line bg-card px-3 py-1.5 text-xs font-semibold text-primary"
              >
                <i className="fa-solid fa-phone text-[11px]" aria-hidden />
                Call
              </a>
            )}
            {restaurant.whatsapp && (
              <a
                href={`https://wa.me/${restaurant.whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="pressable inline-flex items-center gap-1.5 rounded-xl border border-line bg-card px-3 py-1.5 text-xs font-semibold text-primary"
              >
                <i className="fa-brands fa-whatsapp text-[11px]" aria-hidden />
                WhatsApp
              </a>
            )}
          </div>
        )}
      </section>

      {/* Menu */}
      <section className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Menu</h2>
          <span className="text-xs text-text-light">{menu.length} items</span>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-[repeat(auto-fill,minmax(260px,1fr))]">
          {menu.map((food) => (
            <FoodCard key={food.id} food={food} />
          ))}
        </div>
        {menu.length === 0 && (
          <p className="text-sm text-text-light py-6 text-center">
            Menu coming soon.
          </p>
        )}
      </section>
    </div>
  );
}
