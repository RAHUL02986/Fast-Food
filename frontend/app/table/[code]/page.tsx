"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { tableAPI, menuAPI, orderAPI } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import Link from "next/link";
import { ShoppingCart, Star, MapPin, Utensils, RefreshCw } from "lucide-react";
import BrandLogo from "@/components/Logo";
import DishImage from "@/components/DishImage";

const DINE_IN_STEPS = ["placed", "confirmed", "preparing", "served"] as const;
const STEP_LABELS: Record<string, string> = {
  placed: "Received",
  confirmed: "Accepted",
  preparing: "Preparing",
  ready: "Ready",
  served: "Served",
  cancelled: "Cancelled",
};

export default function TablePage() {
  const params = useParams();
  const code = params.code as string;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [table, setTable] = useState<any>(null);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [placing, setPlacing] = useState(false);
  const [showCart, setShowCart] = useState(false);

  const loadOrders = useCallback(async () => {
    if (!table) return;
    try {
      const data = await tableAPI.getTableOrders(table._id, true);
      setOrders(data.data || []);
    } catch {
      /* keep silent on poll */
    }
  }, [table]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await tableAPI.resolveByCode(code);
        setTable(data.data.table);
        setRestaurant(data.data.restaurant);

        const menuData = await menuAPI.getMenuItems(data.data.restaurant._id);
        setMenuItems(menuData.data || []);
      } catch (err: any) {
        setError(err.message || "Invalid table QR code");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [code]);

  useEffect(() => {
    if (!table) return;
    loadOrders();
    const interval = setInterval(loadOrders, 8000); // live dine-in status
    return () => clearInterval(interval);
  }, [table, loadOrders]);

  const addToCart = (item: any) => {
    setCart((prev) => {
      const existing = prev.find((c) => c._id === item._id);
      if (existing) {
        return prev.map((c) => (c._id === item._id ? { ...c, quantity: c.quantity + 1 } : c));
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const changeQty = (itemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => (c._id === itemId ? { ...c, quantity: c.quantity + delta } : c))
        .filter((c) => c.quantity > 0)
    );
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = Math.round(subtotal * 0.05);
  const total = subtotal + tax;
  const categories = [...new Set(menuItems.map((item) => item.category))];
  const activeOrder = orders.find((o) => ["placed", "confirmed", "preparing", "ready"].includes(o.status));
  const currentStepIndex = activeOrder ? DINE_IN_STEPS.indexOf(activeOrder.status as any) : -1;

  const handlePlaceDineInOrder = async () => {
    if (!user) {
      sessionStorage.setItem("qf-checkout", JSON.stringify({
        cart, type: "dine-in", tableId: table._id, tableName: table.name, restaurantId: restaurant._id,
      }));
      // Guests continue on the checkout page — it asks them to log in / sign up
      // as the first step instead of blocking the order here.
      router.push("/checkout");
      return;
    }

    setPlacing(true);
    setError("");
    try {
      await orderAPI.createOrder({
        items: cart.map((item) => ({ menuItem: item._id, quantity: item.quantity })),
        restaurant: restaurant._id,
        type: "dine-in",
        table: table._id,
        paymentMethod: "cash",
      });
      setCart([]);
      setShowCart(false);
      loadOrders();
    } catch (err: any) {
      setError(err.message || "Error placing order");
    } finally {
      setPlacing(false);
    }
  };

  if (loading || authLoading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Opening table menu...</div>;
  }

  if (error && !table) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8 text-center">
        <Utensils size={48} className="text-gray-400 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Table not found</h1>
        <p className="text-gray-600 mb-6">{error}</p>
        <Link href="/" className="bg-orange-600 text-white px-6 py-2 rounded-lg font-bold">Go home</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <BrandLogo href="/" />
          <button onClick={() => setShowCart(!showCart)} className="relative text-orange-600 font-semibold flex items-center gap-2">
            <ShoppingCart size={22} /> Cart
            {cart.length > 0 && (
              <span className="bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{cart.length}</span>
            )}
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto">
        {/* Table header */}
        <div className="bg-white shadow-md p-6 flex flex-wrap gap-4 items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-1 rounded uppercase tracking-wide">Dine-in</span>
              <span className="text-gray-500 text-sm">Table {table.name}</span>
            </div>
            <h1 className="text-3xl font-bold mt-1">{restaurant.name}</h1>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
              <span className="flex items-center gap-1"><MapPin size={14} /> {restaurant.location}</span>
              <span className="flex items-center gap-1"><Star size={14} className="text-yellow-500" fill="currentColor" /> {restaurant.rating || "N/A"}</span>
            </div>
          </div>
          {activeOrder && (
            <button onClick={loadOrders} className="flex items-center gap-2 bg-green-50 text-green-700 border border-green-200 px-4 py-2 rounded-lg text-sm font-semibold">
              <RefreshCw size={15} /> Live order: {STEP_LABELS[activeOrder.status] || activeOrder.status}
            </button>
          )}
        </div>

        <div className="max-w-7xl mx-auto p-8 space-y-8">
          {/* Live dine-in order tracker */}
          {activeOrder && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold mb-4">
                Your dine-in order {activeOrder.orderNumber}
              </h2>
              <div className="flex items-center">
                {DINE_IN_STEPS.map((step, idx) => (
                  <div key={step} className="flex-1 flex items-center last:flex-none">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${
                          idx <= currentStepIndex ? "bg-orange-600 text-white" : "bg-gray-200 text-gray-500"
                        }`}
                      >
                        {idx < currentStepIndex ? "✓" : idx + 1}
                      </div>
                      <span className={`text-xs mt-1 font-semibold ${idx <= currentStepIndex ? "text-orange-700" : "text-gray-400"}`}>
                        {STEP_LABELS[step]}
                      </span>
                    </div>
                    {idx < DINE_IN_STEPS.length - 1 && (
                      <div className={`flex-1 h-1 mx-2 rounded ${idx < currentStepIndex ? "bg-orange-600" : "bg-gray-200"}`} />
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-1">
                {activeOrder.items?.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm text-gray-600">
                    <span>{item.menuItem?.name || "Item"} × {item.quantity}</span>
                    <span>₹{item.price * item.quantity}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm font-bold text-gray-800 border-t pt-2">
                  <span>Total</span>
                  <span>₹{activeOrder.total}</span>
                </div>
              </div>
            </div>
          )}

          {/* Past dine-in orders at this table */}
          {orders.filter((o) => o._id !== activeOrder?._id).length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold mb-3">Earlier orders at this table</h2>
              <div className="space-y-2">
                {orders.filter((o: any) => o._id !== activeOrder?._id).map((o: any) => (
                  <div key={o._id} className="flex justify-between items-center text-sm border-b pb-2 last:border-0">
                    <span className="font-semibold">{o.orderNumber}</span>
                    <span className="text-gray-500">{o.items?.length} items · ₹{o.total}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      o.status === "served" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                    }`}>
                      {STEP_LABELS[o.status] || o.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Menu */}
          {categories.map((category) => (
            <div key={category}>
              <h2 className="text-xl font-bold mb-3">{category}</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {menuItems.filter((item) => item.category === category).map((item: any) => (
                  <div key={item._id} className="bg-white p-4 rounded-lg shadow flex gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-4 h-4 border flex items-center justify-center text-[10px] font-bold ${item.isVeg ? "border-green-600 text-green-700" : "border-red-600 text-red-700"}`}>
                          {item.isVeg ? "●" : "▲"}
                        </span>
                        <h3 className="font-bold">{item.name}</h3>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                      <p className="font-bold mt-2">₹{item.price}</p>
                      <button
                        onClick={() => addToCart(item)}
                        disabled={!item.isAvailable}
                        className="mt-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 text-white text-sm font-bold px-4 py-1.5 rounded-lg transition"
                      >
                        {item.isAvailable ? "Add to order" : "Unavailable"}
                      </button>
                    </div>
                    <DishImage name={item.name} category={item.category} image={item.image} alt={item.name} className="w-24 h-24 object-cover rounded-lg flex-shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cart drawer */}
      {showCart && (
        <div className="fixed inset-0 bg-black/40 z-40 flex justify-end" onClick={() => setShowCart(false)}>
          <div className="bg-white w-full max-w-md h-full p-6 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">Your dine-in order · Table {table.name}</h2>
            {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">{error}</div>}
            {cart.length === 0 ? (
              <p className="text-gray-500">Cart is empty. Add items from the menu.</p>
            ) : (
              <>
                <div className="space-y-3 mb-4">
                  {cart.map((item) => (
                    <div key={item._id} className="flex justify-between items-center border-b pb-2">
                      <div>
                        <p className="font-semibold text-sm">{item.name}</p>
                        <p className="text-xs text-gray-500">₹{item.price} each</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => changeQty(item._id, -1)} className="w-7 h-7 rounded bg-gray-100 font-bold">−</button>
                        <span className="font-semibold">{item.quantity}</span>
                        <button onClick={() => changeQty(item._id, 1)} className="w-7 h-7 rounded bg-gray-100 font-bold">+</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="space-y-2 text-sm border-t pt-3">
                  <div className="flex justify-between"><span className="text-gray-600">Subtotal</span><span>₹{subtotal}</span></div>
                  <div className="flex justify-between"><span className="text-gray-600">Tax (5%)</span><span>₹{tax}</span></div>
                  <div className="flex justify-between font-bold text-lg"><span>Total</span><span className="text-orange-600">₹{total}</span></div>
                </div>
                <button
                  onClick={handlePlaceDineInOrder}
                  disabled={placing}
                  className="w-full mt-4 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg transition"
                >
                  {placing ? "Placing order..." : user ? "Send to kitchen" : "Login & send to kitchen"}
                </button>
                {!user && (
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    You'll be asked to sign in first — your cart is saved.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}