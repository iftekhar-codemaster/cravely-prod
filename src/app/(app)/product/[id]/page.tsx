import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import CloseButton from "@/components/CloseButton";
import ViewTracker from "@/components/ViewTracker";
import SmartImg from "@/components/SmartImg";
import LocationMap from "@/components/LocationMap";
import {
  getFood,
  getFoodsByIds,
  getRestaurant,
  getRelatedFoods,
  getReviews,
} from "@/lib/data";
import { APP_URL } from "@/lib/site";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const food = await getFood(decodeURIComponent(id));
  if (!food) return { title: "Dish not found" };
  const restaurant = await getRestaurant(food.restaurantId);
  const title = restaurant ? `${food.name} — ${restaurant.name}` : food.name;
  const description =
    food.description ||
    `${food.name} for ৳${food.price} at ${restaurant?.name ?? "a kitchen near you"} — rated ${food.rating} on Cravely.`;
  return {
    title,
    description,
    alternates: { canonical: `${APP_URL}/product/${food.id}` },
    openGraph: {
      title,
      description,
      url: `${APP_URL}/product/${food.id}`,
      images: [{ url: food.image }],
      type: "article",
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  const foodId = decodeURIComponent(id);
  const food = await getFood(foodId);
  if (!food) notFound();

  const restaurant = await getRestaurant(food.restaurantId);
  const fallback = await getRelatedFoods(food);
  const pairIds = food.pairsWith?.filter((pid) => pid !== food.id) ?? [];
  let related = fallback.slice(0, 4);
  if (pairIds.length) {
    const [paired] = await Promise.all([getFoodsByIds(pairIds), fallback]);
    const extra = fallback.filter(
      (f) => f.id !== food.id && !paired.some((p) => p.id === f.id),
    );
    related = [...paired, ...extra].slice(0, 4);
  }
  const reviews = getReviews(foodId);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: food.name,
      image: [food.image, ...(food.images ?? [])],
      description: food.description,
      ...(restaurant
        ? { brand: { "@type": "Brand", name: restaurant.name } }
        : {}),
      ...(food.rating > 0
        ? {
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: food.rating,
              reviewCount: food.reviews,
            },
          }
        : {}),
      offers: {
        "@type": "Offer",
        price: food.price,
        priceCurrency: "BDT",
        availability: "https://schema.org/InStock",
        ...(restaurant?.lat && restaurant?.lng
          ? {
              areaServed: {
                "@type": "Place",
                geo: {
                  "@type": "GeoCoordinates",
                  latitude: restaurant.lat,
                  longitude: restaurant.lng,
                },
              },
            }
          : {}),
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: APP_URL },
        ...(restaurant
          ? [
              {
                "@type": "ListItem",
                position: 2,
                name: restaurant.name,
                item: `${APP_URL}/restaurants/${restaurant.id}`,
              },
            ]
          : []),
        {
          "@type": "ListItem",
          position: restaurant ? 3 : 2,
          name: food.name,
          item: `${APP_URL}/product/${food.id}`,
        },
      ],
    },
  ];

  return (
    <div className="relative">
      <ViewTracker foodId={food.id} />
      <CloseButton />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Image */}
      <section className="anim-fade-up relative w-full aspect-square bg-gray-200 flex items-center justify-center">
        <SmartImg
          src={food.image}
          alt={food.name}
          eager
          className="w-full h-full"
          imgClassName="w-full h-full object-cover"
        />
        <div className="absolute bottom-4 right-4 bg-gray-900 text-white font-bold px-4 py-2 rounded-full shadow-lg text-lg">
          ৳{food.price}
        </div>
      </section>

      {/* Restaurant & food header */}
      <section className="p-5 flex items-center gap-4 border-b border-line anim-fade-up" style={{ animationDelay: "80ms" }}>
        {restaurant && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={restaurant.logo}
              alt=""
              loading="lazy"
              className="w-16 h-16 rounded-xl flex-shrink-0 object-cover border border-gray-300"
            />
            <div className="flex flex-col min-w-0">
              <Link
                href={`/restaurants/${restaurant.id}`}
                className="text-sm font-medium text-text-light uppercase tracking-wide truncate"
              >
                {restaurant.name}
              </Link>
              <h1 className="text-2xl font-extrabold leading-tight">{food.name}</h1>
            </div>
          </>
        )}
      </section>

      {/* Description */}
      <section className="p-5 border-b border-line">
        <h2 className="text-lg font-bold mb-2">Description</h2>
        <p className="text-text-light leading-relaxed text-sm">{food.description}</p>
        <div className="mt-3 text-sm font-semibold text-[#ffa502]">
          <i className="fa-solid fa-star mr-1" aria-hidden />
          {food.rating}{" "}
          <span className="text-text-light font-normal">({food.reviews}+ reviews)</span>
        </div>
      </section>

      {/* Location */}
      {restaurant && (
        <section className="p-5 border-b border-line">
          <h2 className="text-lg font-bold mb-2">Location</h2>
          <div className="flex items-start gap-3 mt-2">
            <i className="fa-solid fa-map-pin text-text-light w-5 mt-0.5" aria-hidden />
            <p className="text-text-light text-sm">
              {restaurant.address}
              <br />
              Open today until {restaurant.openUntil}
            </p>
          </div>
          <LocationMap lat={restaurant.lat} lng={restaurant.lng} address={restaurant.address} />
          {(restaurant.phone || restaurant.whatsapp) && (
            <div className="flex gap-2 mt-3">
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
      )}

      {/* Reviews */}
      <section className="p-5 border-b border-line">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Reviews</h2>
          <span className="text-sm font-bold text-[#ffa502] flex items-center gap-1">
            <i className="fa-solid fa-star fill-current" aria-hidden /> {food.rating} (
            {food.reviews})
          </span>
        </div>
        <div className="space-y-3">
          {reviews.map((review) => (
            <div key={review.author} className="bg-background p-3 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 bg-gray-300 rounded-full" />
                <span className="text-sm font-semibold text-text-dark">{review.author}</span>
              </div>
              <p className="text-sm text-text-light">{review.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Also ate together with */}
      <section className="p-5 pb-32">
        <h2 className="text-lg font-bold mb-4">Also ate together with</h2>
        <div className="space-y-4">
          {related.map((item, i) => (
            <Link
              key={item.id}
              href={`/product/${item.id}`}
              className="anim-fade-up flex items-center gap-4 pressable"
              style={{ animationDelay: `${Math.min(i * 70, 280)}ms` }}
            >
              <SmartImg
                src={item.image}
                alt={item.name}
                className="w-14 h-14 rounded-lg bg-gray-200 flex-shrink-0"
                imgClassName="w-full h-full object-cover"
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{item.name}</h3>
                <p className="text-sm text-text-light truncate">{item.category}</p>
              </div>
              <span className="font-bold">+৳{item.price}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
