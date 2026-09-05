"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { restaurantAPI, menuAPI } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { CustomerNav } from "@/components/Navs";
import Link from "next/link";
import { ShoppingCart, Star, MapPin, Utensils, CalendarDays, Plus, Minus, Trash2, ArrowRight, Clock, IndianRupee } from "lucide-react";
import DishImage from "@/components/DishImage";

export default function RestaurantPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<any[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [activeCategory, setActiveCategory] = useState("");
  const categoryRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    const fetchData = async () => {
      const restaurantId = typeof params?.id === "string" ? params.id : "";

      if (!restaurantId) {
        setRestaurant(null);
        setMenuItems([]);
        setError("Invalid restaurant link.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const [restData, menuData] = await Promise.all([
          restaurantAPI.getRestaurantById(restaurantId),
          menuAPI.getMenuItems(restaurantId),
        ]);

        setRestaurant(restData.data);
        setMenuItems(menuData.data || []);
        if (menuData.data && menuData.data.length > 0) {
          setActiveCategory(menuData.data[0].category);
        }
      } catch (fetchError) {
        console.error("Error fetching data:", fetchError);
        setRestaurant(null);
        setMenuItems([]);
        setError("Unable to load this restaurant right now. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params.id]);

  const addToCart = (item: any) => {
    setCart((prev) => {
      const existing = prev.find((c) => c._id === item._id);
      if (existing) {
        return prev.map((c) => (c._id === item._id ? { ...c, quantity: c.quantity + 1 } : c));
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    setShowCart(true);
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => {
      const existing = prev.find((c) => c._id === itemId);
      if (existing && existing.quantity > 1) {
        return prev.map((c) => (c._id === itemId ? { ...c, quantity: c.quantity - 1 } : c));
      }
      return prev.filter((c) => c._id !== itemId);
    });
  };

  const getCartQuantity = (itemId: string) => {
    const item = cart.find((c) => c._id === itemId);
    return item ? item.quantity : 0;
  };

  const getTotalItems = () => cart.reduce((sum, item) => sum + item.quantity, 0);
  const getTotal = () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleCheckout = () => {
    if (!user) {
      alert("Please login to place an order");
      router.push("/login");
      return;
    }
    if (cart.length === 0) {
      alert("Your cart is empty");
      return;
    }
    sessionStorage.setItem("qf-checkout", JSON.stringify({
      cart,
      type: "delivery",
      restaurantId: restaurant._id,
    }));
    router.push("/checkout");
  };

  const scrollToCategory = (category: string) => {
    setActiveCategory(category);
    categoryRefs.current[category]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading restaurant...</p>
        </div>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="min-h-screen bg-gray-50">
        <CustomerNav />
        <div className="max-w-2xl mx-auto p-8 text-center">
          <div className="bg-white p-12 rounded-lg shadow mt-8">
            <p className="text-5xl mb-4">🔍</p>
            <h1 className="text-2xl font-bold mb-2">{error ? "Something went wrong" : "Restaurant not found"}</h1>
            <p className="text-gray-600 mb-6">
              {error || "It may have been removed or is not yet approved."}
            </p>
            <Link href="/restaurants" className="bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-700 inline-block">
              Browse Restaurants
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const categories = [...new Set(menuItems.map((item) => item.category))];
  const deliveryCharge = restaurant.deliveryCharge || 40;
  const totalItems = getTotalItems();

  return (
    <div className={`min-h-screen bg-gray-50 ${totalItems > 0 && !showCart ? "pb-20 lg:pb-0" : ""}`}>
      {/* Navigation */}
      <CustomerNav>
        <button onClick={() => setShowCart(!showCart)} className="relative text-orange-600 font-semibold" title="Toggle cart">
          <ShoppingCart size={24} />
          {totalItems > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {totalItems}
            </span>
          )}
        </button>
      </CustomerNav>

      <div className="max-w-7xl mx-auto">
        {/* Restaurant Header */}
        <div className="bg-white shadow-md mt-[50px]">
          <div className="h-96 bg-gray-300 relative">
            {restaurant.banner && <img src={restaurant.banner} alt={restaurant.name} className="w-full h-full object-cover" />}
          </div>
          <div className="p-8">
            <h1 className="text-4xl font-bold mb-4">{restaurant.name}</h1>
            <div className="flex gap-8 mb-4">
              <div>
                <p className="text-gray-600 text-sm">Cuisines</p>
                <p className="font-semibold">{restaurant.cuisine?.join(", ")}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Rating</p>
                <div className="flex items-center gap-1">
                  <Star size={18} fill="currentColor" className="text-yellow-500" />
                  <span className="font-semibold text-lg">{restaurant.rating || "N/A"}</span>
                </div>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Delivery Time</p>
                <p className="font-semibold">{restaurant.deliveryTime} minutes</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm">Delivery Charge</p>
                <p className="font-semibold">₹{restaurant.deliveryCharge || 40}</p>
              </div>
            </div>
            <div className="flex items-center text-gray-600 text-sm">
              <MapPin size={16} />
              <span className="ml-2">{restaurant.location}</span>
            </div>
            <div className="flex gap-3 mt-6">
              <a
                href={`/bookings/book?restaurant=${restaurant._id}`}
                className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white px-5 py-2.5 rounded-lg font-bold transition"
              >
                <CalendarDays size={18} />
                Book a Table
              </a>
              <a
                href="#menu"
                className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-lg font-bold transition"
              >
                <Utensils size={18} />
                Order Delivery
              </a>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-8 p-8">
          {/* Menu */}
          <div className="col-span-2 space-y-8">
            {categories.map((category) => (
              <div key={category}>
                <h2 className="text-2xl font-bold mb-4">{category}</h2>
                <div className="grid grid-cols-2 gap-4">
                  {menuItems
                    .filter((item) => item.category === category)
                    .map((item) => (
                      <div key={item._id} className="bg-white p-4 rounded-lg shadow hover:shadow-md">
                        <div className="h-32 bg-gray-100 rounded mb-3 overflow-hidden">
                          <DishImage name={item.name} category={item.category} image={item.image} alt={item.name} className="w-full h-full object-cover rounded" />
                        </div>
                        <h3 className="font-bold mb-1">{item.name}</h3>
                        <p className="text-gray-600 text-sm mb-2 line-clamp-2">{item.description}</p>
                        <div className="flex justify-between items-center">
                          <p className="font-bold text-lg">₹{item.price}</p>
                          {getCartQuantity(item._id) > 0 ? (
                            <div className="flex items-center gap-1 bg-orange-600 text-white rounded-lg">
                              <button
                                onClick={() => removeFromCart(item._id)}
                                className="px-2.5 py-1 text-lg leading-none hover:bg-orange-700 rounded-l-lg"
                                title="Remove one"
                              >
                                −
                              </button>
                              <span className="font-bold text-sm min-w-[20px] text-center">{getCartQuantity(item._id)}</span>
                              <button
                                onClick={() => addToCart(item)}
                                className="px-2.5 py-1 text-lg leading-none hover:bg-orange-700 rounded-r-lg"
                                title="Add one"
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => addToCart(item)}
                              disabled={!item.isAvailable}
                              className="bg-orange-600 text-white px-4 py-1.5 rounded font-semibold hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                              {item.isAvailable ? "Add" : "Sold out"}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>

          {/* Cart Sidebar */}
          {showCart && (
            <div className="col-span-1">
              <div className="bg-white p-6 rounded-lg shadow sticky top-24">
                <h2 className="text-2xl font-bold mb-4">Your Order</h2>

                {cart.length === 0 ? (
                  <p className="text-gray-500">Your cart is empty</p>
                ) : (
                  <>
                    <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
                      {cart.map((item) => (
                        <div key={item._id} className="flex justify-between items-center border-b pb-2">
                          <div>
                            <p className="font-semibold text-sm">{item.name}</p>
                            <p className="text-gray-600 text-xs">₹{item.price} × {item.quantity}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => removeFromCart(item._id)}
                              className="w-7 h-7 rounded-full bg-gray-100 hover:bg-orange-100 text-orange-600 font-bold leading-none"
                              title="Remove one"
                            >
                              −
                            </button>
                            <span className="w-6 text-center font-semibold text-sm">{item.quantity}</span>
                            <button
                              onClick={() => addToCart(item)}
                              className="w-7 h-7 rounded-full bg-orange-600 text-white hover:bg-orange-700 font-bold leading-none"
                              title="Add one"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-t pt-3 space-y-2 mb-4">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Subtotal</span>
                        <span className="font-bold">₹{getTotal()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Delivery</span>
                        <span className="font-bold">₹{restaurant.deliveryCharge || 40}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total</span>
                        <span>₹{getTotal() + (restaurant.deliveryCharge || 40)}</span>
                      </div>
                    </div>

                    <button onClick={handleCheckout}
                      className="w-full bg-orange-600 text-white py-3 rounded font-bold hover:bg-orange-700"
                    >
                      Checkout · ₹{getTotal() + deliveryCharge}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Mobile sticky cart bar */}
        {totalItems > 0 && !showCart && (
          <div className="fixed bottom-0 left-0 right-0 z-30 lg:hidden">
            <button
              onClick={() => setShowCart(true)}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white py-4 px-6 flex justify-between items-center font-bold shadow-2xl"
            >
              <span className="flex items-center gap-2">
                <ShoppingCart size={20} />
                {totalItems} item{totalItems > 1 ? "s" : ""} · ₹{getTotal() + deliveryCharge}
              </span>
              <span className="bg-white text-orange-600 px-3 py-1 rounded-full text-sm">View Cart →</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
