import { notFound } from "next/navigation";
import CloseButton from "@/components/CloseButton";
import SmartImg from "@/components/SmartImg";
import FoodCard from "@/components/FoodCard";
import { getRestaurant, getFoodsByRestaurant } from "@/lib/data";

export default async function RestaurantDetailPage({
  params,
}: PageProps<"/restaurants/[id]">) {
  const { id } = await params;
  const restaurant = await getRestaurant(id);
  if (!restaurant) notFound();

  const menu = await getFoodsByRestaurant(restaurant.id);

  return (
    <div className="relative pb-6">
      <CloseButton />

      {/* Hero */}
      <div className="relative h-48 bg-gray-200">
        <SmartImg src={restaurant.image} alt={restaurant.name} eager className="w-full h-full" imgClassName="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
      </div>

      <section className="p-5 border-b border-line">
        <h1 className="text-2xl font-extrabold flex items-center gap-2">
          {restaurant.name}
          {restaurant.verified && (
            <i
              className="fa-solid fa-circle-check text-primary text-base"
              title="Verified"
              aria-label="Verified"
            />
          )}
        </h1>
        <p className="text-sm text-text-light mt-1">
          {restaurant.cuisine} · {restaurant.address}
        </p>
        <div className="flex gap-4 mt-3 text-sm">
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
        </div>
      </section>

      {/* Menu */}
      <section className="p-5">
        <h2 className="text-lg font-bold mb-4">Menu</h2>
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
