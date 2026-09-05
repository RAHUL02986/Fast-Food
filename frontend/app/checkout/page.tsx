"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { orderAPI, restaurantAPI } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { CustomerNav } from "@/components/Navs";
import Link from "next/link";
import { MapPin, CreditCard, Wallet, Banknote, Smartphone, Utensils, Bike } from "lucide-react";

interface CartItem {
  _id: string;
  name: string;
  price: number;
  quantity: number;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<"delivery" | "dine-in">("delivery");
  const [tableId, setTableId] = useState("");
  const [tableName, setTableName] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [selectedAddress, setSelectedAddress] = useState<number>(-1);
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("qf-checkout");
      if (!raw) return;
      const data = JSON.parse(raw);
      setCart(data.cart || []);
      setOrderType(data.type || "delivery");
      setTableId(data.tableId || "");
      setTableName(data.tableName || "");
      setBookingId(data.bookingId || "");
      if (data.restaurantId) {
        restaurantAPI.getRestaurantById(data.restaurantId).then((res) => setRestaurant(res.data));
      }
    } catch {
      setError("Checkout session expired. Please start again.");
    }
  }, []);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryCharge = orderType === "delivery" ? restaurant?.deliveryCharge || 40 : 0;
  const tax = Math.round(subtotal * 0.05);
  const total = subtotal + deliveryCharge + tax;

  const addresses = user?.addresses?.length
    ? user.addresses
    : user?.address
    ? [{ label: "Default", line: user.address, city: user.city, phone: user.phone, isDefault: true }]
    : [];

  useEffect(() => {
    if (selectedAddress === -1 && addresses.length > 0) {
      const idx = addresses.findIndex((a: any) => a.isDefault);
      setSelectedAddress(idx >= 0 ? idx : 0);
    }
  }, [user]);

  const handlePlaceOrder = async () => {
    setError("");

    if (!user) {
      router.push("/login");
      return;
    }
    if (cart.length === 0) {
      setError("Your cart is empty");
      return;
    }
    if (orderType === "delivery" && selectedAddress < 0) {
      setError("Please select a delivery address");
      return;
    }

    setPlacing(true);
    try {
      const payload: any = {
        items: cart.map((item) => ({ menuItem: item._id, quantity: item.quantity })),
        restaurant: restaurant._id,
        type: orderType,
        paymentMethod,
      };
      if (orderType === "delivery") {
        const addr = addresses[selectedAddress];
        payload.deliveryAddress = {
          street: addr.line,
          city: addr.city || user?.city,
          zip: addr.zip,
        };
      } else {
        payload.table = tableId;
        if (bookingId) payload.booking = bookingId;
      }

      const res = await orderAPI.createOrder(payload);
      sessionStorage.removeItem("qf-checkout");
      router.push(`/orders/${res.data._id}`);
    } catch (err: any) {
      setError(err.message || "Error placing order");
      setPlacing(false);
    }
  };

  if (authLoading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>;
  }

  const paymentOptions = [
    { id: "card", label: "Credit / Debit Card", icon: CreditCard },
    { id: "upi", label: "UPI", icon: Smartphone },
    { id: "wallet", label: "Wallet", icon: Wallet },
    { id: "cash", label: orderType === "dine-in" ? "Pay at table" : "Cash on delivery", icon: Banknote },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <CustomerNav />

      <div className="max-w-5xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-2">Checkout</h1>
        {restaurant && <p className="text-gray-600 mb-8">Ordering from <strong>{restaurant.name}</strong></p>}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6">{error}</div>
        )}

        <div className="grid md:grid-cols-5 gap-8">
          {/* Left column — details */}
          <div className="md:col-span-3 space-y-6">
            {/* Order type */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-bold mb-4">Order Type</h2>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={orderType === "dine-in"}
                  onClick={() => setOrderType("delivery")}
                  className={`flex items-center gap-2 p-4 rounded-lg border-2 font-semibold text-left disabled:opacity-60 ${
                    orderType === "delivery" ? "border-orange-600 bg-orange-50" : "border-gray-200"
                  }`}
                >
                  <Bike size={20} className="text-orange-600" /> Delivery
                </button>
                <button
                  type="button"
                  disabled={orderType === "delivery"}
                  onClick={() => setOrderType("dine-in")}
                  className={`flex items-center gap-2 p-4 rounded-lg border-2 font-semibold text-left disabled:opacity-60 ${
                    orderType === "dine-in" ? "border-orange-600 bg-orange-50" : "border-gray-200"
                  }`}
                >
                  <Utensils size={20} className="text-orange-600" /> Dine-in{tableName ? ` · ${tableName}` : ""}
                </button>
              </div>
            </div>

            {/* Address (delivery only) */}
            {orderType === "delivery" && (
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-lg font-bold mb-4">Delivery Address</h2>
                {addresses.length === 0 ? (
                  <div className="text-gray-600">
                    No saved addresses.{" "}
                    <Link href="/profile" className="text-orange-600 hover:underline">Add one in your profile →</Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {addresses.map((addr: any, idx: number) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedAddress(idx)}
                        className={`w-full text-left p-4 rounded-lg border-2 ${
                          selectedAddress === idx ? "border-orange-600 bg-orange-50" : "border-gray-200"
                        }`}
                      >
                        <div className="flex items-center gap-2 font-semibold">
                          <MapPin size={16} className="text-orange-600" />
                          {addr.label || "Address"}
                          {addr.isDefault && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Default</span>}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{addr.line}{addr.city ? `, ${addr.city}` : ""}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Payment */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-lg font-bold mb-4">Payment Method</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {paymentOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPaymentMethod(opt.id)}
                    className={`flex items-center gap-3 p-4 rounded-lg border-2 font-semibold ${
                      paymentMethod === opt.id ? "border-orange-600 bg-orange-50" : "border-gray-200"
                    }`}
                  >
                    <opt.icon size={18} className="text-orange-600" />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right column — summary */}
          <div className="md:col-span-2">
            <div className="bg-white p-6 rounded-lg shadow sticky top-24">
              <h2 className="text-lg font-bold mb-4">Order Summary</h2>
              {cart.length === 0 ? (
                <p className="text-gray-500">Your cart is empty.</p>
              ) : (
                <div className="space-y-3 mb-4">
                  {cart.map((item) => (
                    <div key={item._id} className="flex justify-between text-sm">
                      <span className="text-gray-700">{item.name} × {item.quantity}</span>
                      <span className="font-semibold">₹{item.price * item.quantity}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="border-t pt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-semibold">₹{subtotal}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax (5%)</span>
                  <span className="font-semibold">₹{tax}</span>
                </div>
                {orderType === "delivery" && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Delivery Charge</span>
                    <span className="font-semibold">₹{deliveryCharge}</span>
                  </div>
                )}
                <div className="border-t pt-3 flex justify-between text-lg">
                  <span className="font-bold">Total</span>
                  <span className="font-bold text-orange-600">₹{total}</span>
                </div>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={placing || cart.length === 0}
                className="w-full mt-6 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg transition"
              >
                {placing ? "Placing order..." : `Place ${orderType === "dine-in" ? "Dine-in " : ""}Order`}
              </button>
              <p className="text-xs text-gray-500 mt-3 text-center">
                Server-calculated totals — the API recomputes every price.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}