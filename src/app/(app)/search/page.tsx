import type { Metadata } from "next";
import SearchBar from "@/components/SearchBar";
import FoodGrid from "@/components/FoodGrid";
import { searchFoods } from "@/lib/data";
import { APP_URL } from "@/lib/site";

export async function generateMetadata({
  searchParams,
}: PageProps<"/search">): Promise<Metadata> {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q : "";
  return {
    title: query ? `“${query}” — search results` : "Search dishes",
    description: query
      ? `Dishes matching “${query}” in Thakurgaon — prices, ratings and kitchens on Cravely.`
      : "Search every dish and kitchen in Thakurgaon by name or cuisine.",
    alternates: {
      canonical: query ? `${APP_URL}/search?q=${encodeURIComponent(query)}` : `${APP_URL}/search`,
    },
  };
}

export default async function SearchPage({
  searchParams,
}: PageProps<"/search">) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q : "";
  const results = query ? await searchFoods(query) : await searchFoods("");

  return (
    <div className="px-4 pt-6">
      <SearchBar />
      <h1 className="text-lg font-semibold my-4">
        {query ? `Results for “${query}”` : "All Foods"}
        <span className="text-text-light font-normal text-sm ml-2">
          {results.length} items
        </span>
      </h1>
      <FoodGrid foods={results} />
    </div>
  );
}
