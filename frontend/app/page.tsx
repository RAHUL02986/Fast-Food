'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { ArrowRight, MapPin, Search, Star, Clock, Utensils, Bike } from 'lucide-react';
import { restaurantAPI, menuAPI } from '@/lib/api';
import type { MenuItem, Restaurant } from '@/types';
import { CustomerNav } from '@/components/Navs';
import { LogoImage } from '@/components/Logo';
import DishImage from '@/components/DishImage';
import ReviewsSlider from '@/components/ReviewsSlider';
import Footer from '@/components/Footer';
import Loading from './loading';

const categories = [
  { icon: '🍛', label: 'Indian' },
  { icon: '🍝', label: 'Italian' },
  { icon: '🥡', label: 'Chinese' },
  { icon: '🍣', label: 'Japanese' },
  { icon: '🍜', label: 'Asian' },
  { icon: '🥗', label: 'Healthy' },
];

type PopularItem = MenuItem & { restaurantId: string; restaurantName?: string };

export default function Home() {
  const [query, setQuery] = useState('');
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [popularItems, setPopularItems] = useState<PopularItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(true);

  useEffect(() => {
    const minimumLoaderTimer = window.setTimeout(() => {
      setShowLoader(false);
    }, 1600);

    return () => window.clearTimeout(minimumLoaderTimer);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await restaurantAPI.getAllRestaurants();
        setRestaurants(data.data || []);

        // Fetch popular menu items from first few restaurants
        const restaurantList: Restaurant[] = data.data || [];
        const itemsPromises = restaurantList.slice(0, 3).map(async (r) => {
          try {
            const menuData = await menuAPI.getMenuItems(r._id);
            return menuData.data.slice(0, 2).map((item) => ({
              ...item,
              restaurantId: r._id,
              restaurantName: r.name,
            }));
          } catch {
            return [];
          }
        });
        const itemsArrays = await Promise.all(itemsPromises);
        setPopularItems(itemsArrays.flat());
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredRestaurants = restaurants.filter((restaurant) =>
    `${restaurant.name} ${restaurant.cuisine?.join(' ')}`.toLowerCase().includes(query.toLowerCase())
  );

  if (loading || showLoader) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CustomerNav />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-16 md:py-24">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-orange-100 text-sm font-semibold uppercase tracking-wider mb-4">Good food, good plans</p>
              <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
                Your city,<br /><span className="text-yellow-300">served right.</span>
              </h1>
              <p className="text-orange-100 text-lg mb-8 max-w-md">
                Find the places you'll want to come back to. Order in, dine out, or book your next table in a few taps.
              </p>
              <div className="flex gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-4 top-3.5 text-gray-400" size={20} />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search restaurants, dishes, cuisines..."
                    className="w-full pl-12 pr-4 py-3 rounded-xl text-gray-900 border-0 focus:outline-none focus:ring-2 focus:ring-yellow-400 shadow-lg"
                  />
                </div>
                <Link href="/restaurants" className="bg-white text-orange-600 px-6 py-3 rounded-xl font-bold hover:bg-orange-50 transition shadow-lg flex items-center gap-2">
                  Browse All
                </Link>
              </div>
            </div>
            <div className="hidden md:block">
              <img src="https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?auto=format&fit=crop&w=1200&q=90" alt="Delicious food" className="rounded-2xl shadow-2xl w-full h-80 object-cover" />
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Categories */}
        <section className="mb-12">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">What are you craving?</h2>
              <p className="text-gray-600 mt-1">Start with a mood, finish with a favorite.</p>
            </div>
            <Link href="/restaurants" className="text-orange-600 font-semibold hover:text-orange-700 flex items-center gap-1">
              View all <ArrowRight size={16} />
            </Link>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {categories.map(({ icon, label }) => (
              <Link
                key={label}
                href={`/restaurants?cuisine=${encodeURIComponent(label)}`}
                className="bg-white p-4 rounded-xl shadow-sm hover:shadow-md transition text-center border border-gray-100 hover:border-orange-300"
              >
                <span className="text-3xl block mb-2">{icon}</span>
                <span className="text-sm font-semibold text-gray-700">{label}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Popular Dishes - Quick Order */}
        {popularItems.length > 0 && (
          <section className="mb-12">
            <div className="flex justify-between items-end mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Popular Dishes</h2>
                <p className="text-gray-600 mt-1">Order your favorites in one click</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {popularItems.map((item, idx) => (
                <div key={item._id + idx} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition">
                  <div className="h-40 bg-gray-100 overflow-hidden">
                    <DishImage name={item.name} category={item.category} image={item.image} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-gray-900">{item.name}</h3>
                    <p className="text-sm text-gray-500 mb-2">{item.restaurantName}</p>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">{item.description}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-orange-600">₹{item.price}</span>
                      <Link
                        href={`/restaurant/${item.restaurantId}`}
                        className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-orange-700 transition flex items-center gap-1"
                      >
                        <Utensils size={14} /> View & Order
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Customer Reviews Slider — social proof for all visitors */}
        <ReviewsSlider />

        {/* Restaurants */}
        <section className="mb-12">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {query ? `Results for "${query}"` : 'Restaurants Near You'}
              </h2>
              <p className="text-gray-600 mt-1">
                {loading ? 'Loading...' : `${filteredRestaurants.length} restaurants found`}
              </p>
            </div>
            <Link href="/restaurants" className="text-orange-600 font-semibold hover:text-orange-700 flex items-center gap-1">
              Filter & sort <ArrowRight size={16} />
            </Link>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden animate-pulse">
                  <div className="h-48 bg-gray-200" />
                  <div className="p-4">
                    <div className="h-5 bg-gray-200 rounded mb-2" />
                    <div className="h-4 bg-gray-200 rounded w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredRestaurants.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl">
              <p className="text-gray-500 text-lg mb-4">No restaurants found matching your search.</p>
              <Link href="/restaurants" className="text-orange-600 font-semibold hover:underline">
                Browse all restaurants
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRestaurants.map((restaurant) => (
                <div key={restaurant._id} className="bg-white rounded-xl shadow-sm border flex flex-col justify-between border-gray-100 overflow-hidden hover:shadow-lg transition">
                  <Link href={`/restaurant/${restaurant._id}`} className="block">
                    <div className="h-48 bg-gray-200 relative">
                      <img
                        src={restaurant.banner || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=85'}
                        alt={restaurant.name}
                        className="w-full h-full object-cover"
                      />
                      {(restaurant.rating ?? 0) >= 4.5 && (
                        <span className="absolute top-3 left-3 bg-green-600 text-white text-xs font-bold px-2 py-1 rounded">TOP RATED</span>
                      )}
                    </div>
                  </Link>
                  <div className="p-4 ">
                    <div>
                    <Link href={`/restaurant/${restaurant._id}`}>
                      <h3 className="font-bold text-lg text-gray-900 hover:text-orange-600 transition">{restaurant.name}</h3>
                    </Link>
                    <p className="text-sm text-gray-500 mt-1">{restaurant.cuisine?.join(' · ')}</p>
                    <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Star size={14} fill="currentColor" className="text-yellow-500" />
                        {restaurant.rating || 'N/A'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={14} />
                        {restaurant.deliveryTime || 30} min
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin size={14} />
                        {restaurant.location || 'Nearby'}
                      </span>
                    </div>
                    </div>
                    <div className="flex gap-3 mt-4">
                      <Link
                        href={`/restaurant/${restaurant._id}`}
                        className="flex-1 bg-orange-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-orange-700 transition flex items-center justify-center gap-2"
                      >
                        <Bike size={15} /> Order Now
                      </Link>
                      <Link
                        href={`/bookings/book?restaurant=${restaurant._id}`}
                        className="flex-1 border-2 border-green-600 text-green-600 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-50 transition flex items-center justify-center gap-2"
                      >
                        <Utensils size={15} /> Book Table
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

    </div>
  );
}
