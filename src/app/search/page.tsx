import SearchBar from "@/components/SearchBar";
import FoodGrid from "@/components/FoodGrid";
import { searchFoods } from "@/lib/data";

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
