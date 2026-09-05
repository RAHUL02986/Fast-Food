"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { restaurantAPI } from "@/lib/api";
import type { Restaurant } from "@/types";
import { CustomerNav } from "@/components/Navs";
import Link from "next/link";
import { Search, MapPin, Star } from "lucide-react";

function BrowseRestaurants() {
  const searchParams = useSearchParams();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [city, setCity] = useState("");
  const [cuisine, setCuisine] = useState(searchParams.get("cuisine") || "");
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState("-rating");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locStatus, setLocStatus] = useState<"idle" | "loading" | "error">("idle");

  const locate = () => {
    if (!("geolocation" in navigator)) {
      setLocStatus("error");
      return;
    }
    setLocStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocStatus("idle");
      },
      () => setLocStatus("error"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => {
    const fetchRestaurants = async () => {
      setLoading(true);
      try {
        let list: Restaurant[] = [];
        if (coords) {
          // Location-based search: within 5km radius, nearest first
          const data = await restaurantAPI.getNearbyRestaurants({
            lat: coords.lat,
            lng: coords.lng,
            radius: 5,
            search: search || undefined,
            cuisine: cuisine || undefined,
          });
          list = data.data || [];
        } else {
          const data = await restaurantAPI.getAllRestaurants({ search, city });
          list = data.data || [];
          if (cuisine) list = list.filter((r: any) => r.cuisine?.some((c: string) => c.toLowerCase() === cuisine.toLowerCase()));
        }
        if (minRating > 0) list = list.filter((r: any) => (r.rating || 0) >= minRating);
        if (sortBy === "rating") list.sort((a: any, b: any) => (a.rating || 0) - (b.rating || 0));
        else if (sortBy === "-rating") list.sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0));
        else if (sortBy === "deliveryTime") list.sort((a: any, b: any) => (a.deliveryTime || 0) - (b.deliveryTime || 0));
        setRestaurants(list);
      } catch (error) {
        console.error("Error fetching restaurants:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurants();
  }, [search, city, cuisine, minRating, sortBy, coords]);

  return (
    <div className="min-h-screen bg-gray-50">
      <CustomerNav />

      <div className="max-w-7xl mx-auto p-8">
        <h1 className="text-4xl font-bold mb-8">Discover Restaurants</h1>

        {/* Search & Filters */}
        <div className="bg-white p-6 rounded-lg shadow mb-8 space-y-4">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search restaurants, cuisines, cities..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <div className="flex-1 min-w-[160px]">
              <label className="block text-sm font-semibold text-gray-700 mb-2">City / Location</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 text-gray-400" size={20} />
                <input
                  type="text"
                  value={city}
                  onChange={(e) => { setCity(e.target.value); setCoords(null); }}
                  placeholder="Enter city..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <div className="flex items-end pb-0.5">
              <button
                type="button"
                onClick={locate}
                disabled={locStatus === "loading"}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-600 text-white font-semibold text-sm hover:bg-orange-700 transition disabled:opacity-60"
              >
                <MapPin size={16} />
                {locStatus === "loading" ? "Locating..." : coords ? "🔄 Update my location" : "📍 Use my location"}
              </button>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Cuisine</label>
              <select value={cuisine} onChange={(e) => setCuisine(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500">
                <option value="">All cuisines</option>
                {["Indian", "Healthy", "Japanese", "Asian", "Italian", "Chinese"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Min rating</label>
              <select value={minRating} onChange={(e) => setMinRating(Number(e.target.value))} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500">
                <option value={0}>Any</option>
                <option value={4}>4★ & up</option>
                <option value={4.5}>4.5★ & up</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Sort by</label>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500">
                <option value="-rating">Rating (high → low)</option>
                <option value="rating">Rating (low → high)</option>
                <option value="deliveryTime">Fastest delivery</option>
              </select>
            </div>
          </div>
        </div>

        {/* Restaurants Grid */}
        {coords && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-6 text-sm">
            📍 Showing restaurants within <strong>5 km</strong> of your location (nearest first).
            {restaurants.length === 0 && " No restaurants found nearby — try a city search instead."}
          </div>
        )}
        {locStatus === "error" && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
            Could not get your location. Please allow location access or search by city instead.
          </div>
        )}
        {loading ? (
          <div className="text-center py-12">Loading restaurants...</div>
        ) : restaurants.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>
              No restaurants found{(city || search) && <> for &ldquo;{city || search}&rdquo;</>}.
            </p>
            <p className="text-sm mt-2 max-w-xl mx-auto">
              Search matches restaurant name, cuisine, city and street area. Try another city or
              use your location. Note: only approved restaurants appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {restaurants.map((restaurant) => (
              <Link
                key={restaurant._id}
                href={`/restaurant/${restaurant._id}`}
                className="bg-white rounded-lg shadow hover:shadow-lg hover:scale-105 transition overflow-hidden"
              >
                <div className="h-48 bg-gray-300 relative">
                  {restaurant.banner && <img src={restaurant.banner} alt={restaurant.name} className="w-full h-full object-cover" />}
                  {restaurant.distanceKm != null && (
                    <span className="absolute top-3 left-3 bg-white text-orange-600 text-xs font-bold px-2 py-1 rounded-full shadow">
                      📍 {restaurant.distanceKm} km away
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-lg mb-2">{restaurant.name}</h3>
                  <p className="text-gray-600 text-sm mb-2">{restaurant.cuisine?.join(", ")}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{restaurant.deliveryTime} min</span>
                    <div className="flex items-center gap-1">
                      <Star size={16} fill="currentColor" className="text-yellow-500" />
                      <span className="font-semibold">{restaurant.rating || "N/A"}</span>
                    </div>
                  </div>
                  {restaurant.minOrderValue && (
                    <p className="text-xs text-gray-500 mt-2">Min: ₹{restaurant.minOrderValue}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function BrowseRestaurantsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <BrowseRestaurants />
    </Suspense>
  );
}
