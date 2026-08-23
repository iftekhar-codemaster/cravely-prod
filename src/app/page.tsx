import Link from "next/link";
import SearchBar from "@/components/SearchBar";
import FoodGrid from "@/components/FoodGrid";
import { getAllFoods, getStories, getOffers, getCuisines } from "@/lib/data";

export default async function HomePage() {
  const [foods, stories, offers, cuisines] = await Promise.all([
    getAllFoods(),
    getStories(),
    getOffers(),
    getCuisines(),
  ]);

  return (
    <div>
      {/* Search */}
      <section className="px-4 pt-6 pb-2">
        <SearchBar />
      </section>

      {/* Stories */}
      <section className="pt-4">
        <div className="px-4 flex gap-4 overflow-x-auto no-scrollbar pb-1">
          {stories.map((story) => (
            <div key={story.name} className="flex flex-col items-center gap-2 min-w-[72px]">
              <div
                className={`w-[68px] h-[68px] rounded-full p-[3px] ${
                  story.self
                    ? "bg-gray-300"
                    : "bg-[linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)]"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={story.image}
                  alt={story.name}
                  className="w-full h-full rounded-full border-[3px] border-background object-cover"
                />
              </div>
              <span className="text-xs font-medium w-[75px] text-center truncate">
                {story.name}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Offers */}
      <section className="px-4 pt-6">
        <h2 className="text-xl font-semibold mb-4">
          <i className="fa-solid fa-location-dot text-primary mr-2" aria-hidden />
          Thakurgaon&apos;s Offers
        </h2>
        <div className="flex gap-5 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4">
          {offers.map((offer) => (
            <div
              key={offer.title}
              className="min-w-[280px] h-[140px] rounded-xl p-6 text-white flex flex-col justify-center shadow-card bg-cover bg-center"
              style={{
                backgroundImage: `url('${offer.image}')`,
                backgroundColor: offer.bg,
                backgroundBlendMode: "overlay",
              }}
            >
              <h3 className="font-bold text-lg">{offer.title}</h3>
              <p className="text-sm opacity-90 mt-1">{offer.code}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Cuisines */}
      <section className="px-4 pt-7">
        <h2 className="text-xl font-semibold mb-5">Your Cuisines</h2>
        <div className="flex gap-6 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4">
          {cuisines.map((cuisine, i) => (
            <Link
              key={cuisine}
              href={`/search?q=${encodeURIComponent(cuisine)}`}
              className="min-w-[100px] text-center transition-transform hover:-translate-y-1"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://loremflickr.com/120/120/dish?lock=${i + 400}`}
                alt={cuisine}
                className="w-[84px] h-[84px] rounded-[20px] object-cover mx-auto mb-2 shadow-card"
              />
              <p className="text-[15px] font-semibold text-primary">{cuisine}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* All Foods */}
      <section className="px-4 pt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">All Foods</h2>
          <Link
            href="/packages"
            className="bg-primary text-white text-sm px-4 py-2 rounded-full font-semibold hover:shadow-[0_4px_10px_rgba(255,71,87,0.3)] transition-shadow"
          >
            Make your Plan
          </Link>
        </div>
        <FoodGrid foods={foods} />
      </section>

      {/* Footer */}
      <footer className="mt-8 py-8 text-center border-t border-line">
        <div className="flex justify-center gap-5 text-2xl text-text-light mb-3">
          <a href="#" aria-label="Facebook"><i className="fa-brands fa-facebook" aria-hidden /></a>
          <a href="#" aria-label="Instagram"><i className="fa-brands fa-instagram" aria-hidden /></a>
          <a href="#" aria-label="Twitter"><i className="fa-brands fa-twitter" aria-hidden /></a>
        </div>
        <p className="text-sm text-text-light">
          © {new Date().getFullYear()} Cravely. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
