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
import { getSocialLinks, type SocialLinks } from "@/lib/social";

export const revalidate = 60;

export const metadata: Metadata = {
  alternates: { canonical: APP_URL },
};

export default async function HomePage() {
  const [foods, restaurants, offers, cuisines, stories, social] = await Promise.all([
    getAllFoods(),
    getAllRestaurants(),
    getOffers(),
    getCuisines(),
    getStories(),
    getSocialLinks(),
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
        <SocialLinksFooter links={social} />
        <p className="text-sm text-text-light">
          © {new Date().getFullYear()} Cravely. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

const SOCIAL_ICONS: {
  key: keyof SocialLinks;
  label: string;
  icon: string;
}[] = [
  { key: "facebook", label: "Facebook", icon: "fa-brands fa-facebook" },
  { key: "instagram", label: "Instagram", icon: "fa-brands fa-instagram" },
  { key: "twitter", label: "Twitter", icon: "fa-brands fa-twitter" },
  { key: "whatsapp", label: "WhatsApp", icon: "fa-brands fa-whatsapp" },
];

function SocialLinksFooter({ links }: { links: SocialLinks }) {
  const active = SOCIAL_ICONS.filter(({ key }) => Boolean(links[key]));
  if (active.length === 0) return null;
  return (
    <div className="flex justify-center gap-5 text-2xl text-text-light mb-3">
      {active.map(({ key, label, icon }) => (
        <a
          key={key}
          href={links[key] as string}
          aria-label={label}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-primary transition-colors"
        >
          <i className={icon} aria-hidden />
        </a>
      ))}
    </div>
  );
}
