import SearchBar from "@/components/SearchBar";
import { getStories } from "@/lib/data";
import ForYou from "@/components/home/ForYou";
import HomeHeader from "@/components/home/HomeHeader";
import { HomeOffers, HomeCuisines, HomeFoods } from "@/components/home/HomeSections";
import Reveal from "@/components/home/Reveal";

export default async function HomePage() {
  const stories = await getStories();

  return (
    <div>
      {/* Header — live counts + rotating crave line */}
      <section className="px-4 pt-6">
        <HomeHeader />
      </section>

      {/* Search */}
      <section className="px-4 pt-4 pb-2 anim-fade-up" style={{ animationDelay: "90ms" }}>
        <SearchBar />
      </section>

      {/* Stories */}
      <Reveal delay={120}>
        <section className="pt-4">
          <div className="px-4 flex gap-4 overflow-x-auto no-scrollbar pb-1">
            {stories.map((story, i) => (
              <div
                key={story.name}
                className={`anim-pop flex flex-col items-center gap-2 min-w-[72px] pressable`}
                style={{ animationDelay: `${Math.min(i * 55, 400)}ms` }}
              >
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
                    loading="lazy"
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
      </Reveal>

      {/* Personalized picks */}
      <ForYou />

      {/* Auto-rotating offers gallery */}
      <HomeOffers />

      {/* Cuisines */}
      <HomeCuisines />

      {/* All Foods */}
      <HomeFoods />

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
