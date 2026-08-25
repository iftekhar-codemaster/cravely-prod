import type { Metadata } from "next";
import SearchBar from "@/components/SearchBar";
import ForYou from "@/components/home/ForYou";
import HomeHeader from "@/components/home/HomeHeader";
import HomeStories from "@/components/home/HomeStories";
import { HomeOffers, HomeCuisines, HomeFoods } from "@/components/home/HomeSections";
import Reveal from "@/components/home/Reveal";
import {
  getAllFoods,
  getAllRestaurants,
  getOffers,
  getCuisines,
  getStories,
} from "@/lib/data";
import { APP_URL } from "@/lib/site";

export const revalidate = 60;

export const metadata: Metadata = {
  alternates: { canonical: APP_URL },
};

export default async function HomePage() {
  const [foods, restaurants, offers, cuisines, stories] = await Promise.all([
    getAllFoods(),
    getAllRestaurants(),
    getOffers(),
    getCuisines(),
    getStories(),
  ]);

  return (
    <div>
      {/* Header — live counts + rotating crave line */}
      <section className="px-4 pt-6">
        <HomeHeader dishes={foods.length} kitchens={restaurants.length} />
      </section>

      {/* Search */}
      <section className="px-4 pt-4 pb-2 anim-fade-up" style={{ animationDelay: "90ms" }}>
        <SearchBar />
      </section>

      {/* Stories — posted by restaurants */}
      <Reveal delay={120}>
        <section className="pt-4">
          <HomeStories stories={stories} restaurants={restaurants} />
        </section>
      </Reveal>

      {/* Personalized picks */}
      <ForYou foods={foods} restaurants={restaurants} />

      {/* Auto-rotating offers gallery */}
      <HomeOffers offers={offers} />

      {/* Cuisines */}
      <HomeCuisines cuisines={cuisines} />

      {/* All Foods */}
      <HomeFoods foods={foods} />

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
