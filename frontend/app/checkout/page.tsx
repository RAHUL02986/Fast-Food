"use client";
/**
 * Checkout page — Swiggy-style stepped flow:
 *   Step 1 Account (log in / sign up) → Step 2 Delivery address → Step 3 Payment.
 * Guests land here with a cart; auth is requested inline, order summary is on the right.
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { orderAPI, restaurantAPI, couponAPI } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { CustomerNav } from "@/components/Navs";
import Link from "next/link";
import type { Coupon, CouponValidation } from "@/types";
import {
  MapPin,
  CreditCard,
  Wallet,
  Banknote,
  Smartphone,
  Utensils,
  Bike,
  User as UserIcon,
  Lock,
  CheckCircle2,
  Plus,
  Minus,
  Ticket,
  ShoppingBag,
} from "lucide-react";
import { bannerImageFallback, secureImageUrl, FALLBACK_BANNER } from "@/lib/images";

interface CartItem {
  _id: string;
  name: string;
  price: number;
  quantity: number;
  isVeg?: boolean;
}

interface AddressFormState {
  label: string;
  line: string;
  city: string;
  zip: string;
  phone: string;
}

const EMPTY_ADDRESS_FORM: AddressFormState = { label: "Home", line: "", city: "", zip: "", phone: "" };

export default function CheckoutPage() {
  const router = useRouter();
  const { user, loading: authLoading, updateProfile } = useAuth();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [restaurantId, setRestaurantId] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<"delivery" | "dine-in" | "pickup">("delivery");
  const [tableId, setTableId] = useState("");
  const [tableName, setTableName] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [selectedAddress, setSelectedAddress] = useState<number>(-1);
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressForm, setAddressForm] = useState<AddressFormState>(EMPTY_ADDRESS_FORM);

  // ---------- Coupon ----------
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidation | null>(null);
  const [couponError, setCouponError] = useState("");
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([]);

  // Load the checkout session from sessionStorage. Works for guests too — the
  // cart survives the trip to /login and /signup (same tab), so the user picks
  // up exactly where they left off after authenticating.
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
        setRestaurantId(data.restaurantId);
        restaurantAPI.getRestaurantById(data.restaurantId).then((res) => setRestaurant(res.data));
        // Live offers for this restaurant (best-effort — hidden if the fetch fails)
        couponAPI
          .getPublicCoupons(data.restaurantId)
          .then((res) => setAvailableCoupons(res.data || []))
          .catch(() => {});
      }
    } catch {
      setError("Checkout session expired. Please start again.");
    }
  }, []);

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

  // Auto-open the "add address" form for logged-in users with nothing saved yet
  useEffect(() => {
    if (user && !(user.addresses?.length || user.address)) {
      setShowAddressForm(true);
    }
  }, [user]);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = appliedCoupon?.discountAmount || 0;
  const deliveryCharge = orderType === "delivery" ? restaurant?.deliveryCharge || 40 : 0;
  const tax = Math.round((subtotal - discount) * 0.05);
  const total = subtotal - discount + deliveryCharge + tax;

  // Step unlocking — mirrors the Swiggy flow: Account → Delivery address → Payment
  const loggedIn = !!user;
  const addressSelected = selectedAddress >= 0 && !!addresses[selectedAddress];
  const paymentUnlocked = loggedIn && (orderType !== "delivery" || addressSelected);

  const persistCart = (nextCart: CartItem[]) => {
    sessionStorage.setItem(
      "qf-checkout",
      JSON.stringify({ cart: nextCart, type: orderType, tableId, tableName, bookingId, restaurantId })
    );
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) => {
      const next = prev
        .map((c) => (c._id === id ? { ...c, quantity: c.quantity + delta } : c))
        .filter((c) => c.quantity > 0);
      if (next.length > 0) persistCart(next);
      else sessionStorage.removeItem("qf-checkout");
      return next;
    });
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressForm.line.trim()) {
      setError("Please enter your full address");
      return;
    }
    setSavingAddress(true);
    setError("");
    try {
      const newAddress = {
        label: addressForm.label.trim() || "Home",
        line: addressForm.line.trim(),
        city: addressForm.city.trim(),
        zip: addressForm.zip.trim(),
        phone: addressForm.phone.trim(),
        isDefault: addresses.length === 0,
      };
      await updateProfile({ addresses: [...(user?.addresses || []), newAddress] });
      setSelectedAddress(addresses.length); // index the newly appended address will get
      setShowAddressForm(false);
      setAddressForm(EMPTY_ADDRESS_FORM);
    } catch (err: any) {
      setError(err.message || "Could not save the address");
    } finally {
      setSavingAddress(false);
    }
  };

  // ---------- Coupon apply / remove ----------
  const handleApplyCoupon = async (codeArg?: string) => {
    const codeToApply = (codeArg ?? couponInput).trim().toUpperCase();
    setCouponError("");
    if (!codeToApply) {
      setCouponError("Enter a coupon code");
      return;
    }
    if (cart.length === 0) {
      setCouponError("Your cart is empty");
      return;
    }
    setApplyingCoupon(true);
    try {
      const res = await couponAPI.validateCoupon(
        restaurantId || restaurant?._id,
        codeToApply,
        cart.map((item) => ({ menuItem: item._id, quantity: item.quantity }))
      );
      setAppliedCoupon(res.data);
      setCouponInput(res.data.code);
    } catch (err: any) {
      setAppliedCoupon(null);
      setCouponError(err.message || "Could not apply the coupon");
    } finally {
      setApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError("");
  };

  const handlePlaceOrder = async () => {
    setError("");
    if (!user) return; // the button only renders for logged-in users
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
        restaurant: restaurantId || restaurant?._id,
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
      if (appliedCoupon) {
        payload.couponCode = appliedCoupon.code; // re-validated server-side
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
    { id: "cash", label: orderType === "dine-in" ? "Pay at table" : orderType === "pickup" ? "Pay at pickup" : "Cash on delivery", icon: Banknote },
  ];

  const restaurantImage = secureImageUrl(restaurant?.banner || restaurant?.photos?.[0]);

  return (
    <div className="min-h-screen bg-gray-50">
      <CustomerNav />

      <div className="max-w-5xl mx-auto p-4 sm:p-8">
        {cart.length === 0 ? (
          <div className="bg-white p-12 rounded-lg shadow text-center">
            <p className="text-5xl mb-4">🛒</p>
            <h1 className="text-2xl font-bold mb-2">Your cart is empty</h1>
            <p className="text-gray-600 mb-6">Add items from a restaurant menu to start an order.</p>
            <Link
              href="/restaurants"
              className="inline-block bg-orange-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-orange-700 transition"
            >
              Browse Restaurants
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6">{error}</div>
            )}

            <div className="grid md:grid-cols-5 gap-8">
              {/* Left column — steps */}
              <div className="md:col-span-3 space-y-6">
                {/* Order type */}
                <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                  <h2 className="text-lg font-bold mb-4">Order Type</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setOrderType("delivery")}
                      className={`flex items-center gap-2 p-3 sm:p-4 rounded-lg border-2 font-semibold text-left transition ${
                        orderType === "delivery" ? "border-orange-600 bg-orange-50" : "border-gray-200 hover:border-orange-300"
                      }`}
                    >
                      <Bike size={20} className="text-orange-600 shrink-0" />
                      <span className="text-sm sm:text-base">Delivery</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderType("pickup")}
                      className={`flex items-center gap-2 p-3 sm:p-4 rounded-lg border-2 font-semibold text-left transition ${
                        orderType === "pickup" ? "border-orange-600 bg-orange-50" : "border-gray-200 hover:border-orange-300"
                      }`}
                    >
                      <ShoppingBag size={20} className="text-orange-600 shrink-0" />
                      <span className="text-sm sm:text-base">Pickup</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderType("dine-in")}
                      className={`flex items-center gap-2 p-3 sm:p-4 rounded-lg border-2 font-semibold text-left transition ${
                        orderType === "dine-in" ? "border-orange-600 bg-orange-50" : "border-gray-200 hover:border-orange-300"
                      }`}
                    >
                      <Utensils size={20} className="text-orange-600 shrink-0" />
                      <span className="text-sm sm:text-base">Dine-in{tableName ? ` · ${tableName}` : ""}</span>
                    </button>
                  </div>
                  {orderType === "pickup" && (
                    <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                      <MapPin size={14} className="text-orange-500" />
                      Pick up your order from: {restaurant?.name || "Restaurant"}
                    </p>
                  )}
                </div>

                {/* Steps — Account → Delivery address → Payment, connected by a dashed rail */}
                <div className="relative">
                  <div
                    className="absolute left-6 top-6 bottom-6 border-l-2 border-dashed border-gray-300 hidden sm:block"
                    aria-hidden="true"
                  />
                  <div className="space-y-6">
                    {/* Step 1 — Account */}
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 relative z-10 bg-white border-2 ${
                          loggedIn ? "border-green-500" : "border-gray-900"
                        }`}
                      >
                        {loggedIn ? (
                          <CheckCircle2 size={22} className="text-green-600" />
                        ) : (
                          <UserIcon size={22} className="text-gray-900" />
                        )}
                      </div>
                      <div className="flex-1 bg-white p-6 rounded-lg shadow">
                        <h2 className="text-lg font-bold">Account</h2>
                        {loggedIn ? (
                          <div className="mt-2 text-sm text-gray-600 space-y-0.5">
                            <p className="font-semibold text-gray-900">
                              {user?.name}
                              {user?.phone ? ` · ${user.phone}` : ""}
                            </p>
                            <p>{user?.email}</p>
                          </div>
                        ) : (
                          <>
                            <p className="text-gray-600 mt-1 mb-5">
                              To place your order now, log in to your existing account or sign up.
                            </p>
                            <div className="flex flex-wrap gap-3">
                              <Link
                                href="/login?next=/checkout"
                                className="flex-1 min-w-[150px] text-center px-5 py-3 border-2 border-orange-600 text-orange-600 rounded font-bold hover:bg-orange-50 transition text-sm"
                              >
                                Have an account? <span className="underline">LOG IN</span>
                              </Link>
                              <Link
                                href="/signup?next=/checkout"
                                className="flex-1 min-w-[150px] text-center px-5 py-3 bg-orange-600 text-white rounded font-bold hover:bg-orange-700 transition text-sm"
                              >
                                New to Quick Food? <span className="underline">SIGN UP</span>
                              </Link>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Step 2 — Delivery address (delivery orders only) */}
                    {orderType === "delivery" && (
                      <div className="flex items-start gap-4">
                        <div
                          className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 relative z-10 bg-white border-2 ${
                            addressSelected ? "border-green-500" : loggedIn ? "border-gray-900" : "border-gray-200"
                          }`}
                        >
                          {addressSelected ? (
                            <CheckCircle2 size={22} className="text-green-600" />
                          ) : (
                            <MapPin size={22} className={loggedIn ? "text-gray-900" : "text-gray-400"} />
                          )}
                        </div>
                        <div className="flex-1 bg-white p-6 rounded-lg shadow">
                          {loggedIn ? (
                            <>
                              <h2 className="text-lg font-bold mb-4">Delivery address</h2>

                              {addresses.length > 0 && (
                                <div className="space-y-3 mb-4">
                                  {addresses.map((addr: any, idx: number) => (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={() => setSelectedAddress(idx)}
                                      className={`w-full text-left p-4 rounded-lg border-2 transition ${
                                        selectedAddress === idx ? "border-orange-600 bg-orange-50" : "border-gray-200"
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 font-semibold">
                                        <MapPin size={16} className="text-orange-600" />
                                        {addr.label || "Address"}
                                        {addr.isDefault && (
                                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                            Default
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-sm text-gray-600 mt-1">
                                        {addr.line}
                                        {addr.city ? `, ${addr.city}` : ""}
                                      </p>
                                    </button>
                                  ))}
                                </div>
                              )}

                              {showAddressForm ? (
                                <form onSubmit={handleSaveAddress} className="space-y-3 border-t pt-4">
                                  <div className="grid sm:grid-cols-2 gap-3">
                                    <input
                                      type="text"
                                      value={addressForm.label}
                                      onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })}
                                      placeholder="Label (Home, Work…)"
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    />
                                    <input
                                      type="text"
                                      value={addressForm.phone}
                                      onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                                      placeholder="Phone (optional)"
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    />
                                  </div>
                                  <input
                                    type="text"
                                    value={addressForm.line}
                                    onChange={(e) => setAddressForm({ ...addressForm, line: e.target.value })}
                                    placeholder="Full address — flat, street, landmark"
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                  />
                                  <div className="grid sm:grid-cols-2 gap-3">
                                    <input
                                      type="text"
                                      value={addressForm.city}
                                      onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                                      placeholder="City (optional)"
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    />
                                    <input
                                      type="text"
                                      value={addressForm.zip}
                                      onChange={(e) => setAddressForm({ ...addressForm, zip: e.target.value })}
                                      placeholder="PIN code (optional)"
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    />
                                  </div>
                                  <div className="flex gap-3">
                                    <button
                                      type="submit"
                                      disabled={savingAddress}
                                      className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white font-bold px-6 py-2 rounded-lg transition text-sm"
                                    >
                                      {savingAddress ? "Saving..." : "Save address"}
                                    </button>
                                    {addresses.length > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setShowAddressForm(false);
                                          setAddressForm(EMPTY_ADDRESS_FORM);
                                        }}
                                        className="px-4 py-2 text-gray-600 hover:text-gray-900 font-semibold text-sm"
                                      >
                                        Cancel
                                      </button>
                                    )}
                                  </div>
                                </form>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setShowAddressForm(true)}
                                  className="text-orange-600 font-semibold text-sm hover:underline"
                                >
                                  + Add new address
                                </button>
                              )}
                            </>
                          ) : (
                            <>
                              <div className="flex items-center justify-between">
                                <h2 className="text-lg font-bold text-gray-400">Delivery address</h2>
                                <Lock size={18} className="text-gray-400" />
                              </div>
                              <p className="text-gray-400 text-sm mt-1">
                                Log in or sign up to choose where we deliver.
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Step 3 — Payment */}
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 relative z-10 bg-white border-2 ${
                          paymentUnlocked ? "border-gray-900" : "border-gray-200"
                        }`}
                      >
                        {paymentUnlocked ? (
                          <CreditCard size={22} className="text-gray-900" />
                        ) : (
                          <Lock size={22} className="text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 bg-white p-6 rounded-lg shadow">
                        {paymentUnlocked ? (
                          <>
                            <h2 className="text-lg font-bold mb-4">Payment</h2>
                            <div className="grid sm:grid-cols-2 gap-3 mb-5">
                              {paymentOptions.map((opt) => (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={() => setPaymentMethod(opt.id)}
                                  className={`flex items-center gap-3 p-4 rounded-lg border-2 font-semibold transition ${
                                    paymentMethod === opt.id ? "border-orange-600 bg-orange-50" : "border-gray-200"
                                  }`}
                                >
                                  <opt.icon size={18} className="text-orange-600" />
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                            <button
                              onClick={handlePlaceOrder}
                              disabled={placing}
                              className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg transition"
                            >
                              {placing
                                ? "Placing order..."
                                : `Place ${orderType === "dine-in" ? "Dine-in " : orderType === "pickup" ? "Pickup " : ""}Order · ₹${total}`}
                            </button>
                            <p className="text-xs text-gray-500 mt-3 text-center">
                              Server-calculated totals — the API recomputes every price.
                            </p>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center justify-between">
                              <h2 className="text-lg font-bold text-gray-400">Payment</h2>
                              <Lock size={18} className="text-gray-400" />
                            </div>
                            <p className="text-gray-400 text-sm mt-1">
                              {loggedIn
                                ? "Select a delivery address to continue."
                                : "Complete the steps above to continue."}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right column — summary */}
              <div className="md:col-span-2">
                <div className="bg-white rounded-lg shadow sticky top-24">
                  {restaurant && (
                    <div className="flex items-center gap-3 p-5 border-b">
                      <img
                        src={restaurantImage || FALLBACK_BANNER}
                        alt={restaurant.name}
                        onError={bannerImageFallback}
                        className="w-12 h-12 rounded object-cover"
                      />
                      <div className="min-w-0">
                        <p className="font-bold truncate">{restaurant.name}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {restaurant.location || restaurant.city}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="p-5">
                    <div className="space-y-3 mb-5 max-h-64 overflow-y-auto">
                      {cart.map((item) => (
                        <div key={item._id} className="flex items-center gap-3">
                          <span
                            className={`w-3.5 h-3.5 shrink-0 border-2 flex items-center justify-center ${
                              item.isVeg ? "border-green-600" : "border-red-600"
                            }`}
                            title={item.isVeg ? "Veg" : "Non-veg"}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                item.isVeg ? "bg-green-600" : "bg-red-600"
                              }`}
                            />
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{item.name}</p>
                            <p className="text-xs text-gray-500">₹{item.price}</p>
                          </div>
                          <div className="flex items-center border border-gray-300 rounded">
                            <button
                              type="button"
                              onClick={() => updateQty(item._id, -1)}
                              className="px-2 py-0.5 text-orange-600 hover:bg-orange-50"
                              title="Remove one"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateQty(item._id, 1)}
                              className="px-2 py-0.5 text-orange-600 hover:bg-orange-50"
                              title="Add one"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          <span className="w-14 text-right text-sm font-semibold">
                            ₹{item.price * item.quantity}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Coupon */}
                    <div className="mb-5">
                      {appliedCoupon ? (
                        <div className="flex items-center justify-between gap-3 bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <Ticket size={18} className="text-green-700 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-green-700">{appliedCoupon.code} applied</p>
                              <p className="text-xs text-gray-600 truncate">
                                {appliedCoupon.discountType === "percentage"
                                  ? `${appliedCoupon.discountValue}% off`
                                  : `₹${appliedCoupon.discountValue} off`}
                                {appliedCoupon.applyToAllItems
                                  ? " · entire menu"
                                  : " · selected products"}{" "}
                                · You save ₹{appliedCoupon.discountAmount}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={handleRemoveCoupon}
                            className="text-red-600 text-sm font-semibold hover:underline shrink-0"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <Ticket size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                              <input
                                type="text"
                                value={couponInput}
                                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleApplyCoupon())}
                                placeholder="Enter coupon code"
                                className="w-full border rounded pl-9 pr-3 py-2 text-sm uppercase"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleApplyCoupon()}
                              disabled={applyingCoupon}
                              className="bg-orange-600 text-white px-4 rounded font-bold text-sm hover:bg-orange-700 disabled:bg-gray-400 whitespace-nowrap"
                            >
                              {applyingCoupon ? "Checking…" : "Apply"}
                            </button>
                          </div>
                          {couponError && <p className="text-xs text-red-600 mt-1">{couponError}</p>}
                          {availableCoupons.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {availableCoupons.slice(0, 3).map((c) => (
                                <button
                                  key={c._id}
                                  type="button"
                                  onClick={() => handleApplyCoupon(c.code)}
                                  className="w-full text-left text-xs bg-orange-50 border border-orange-200 rounded px-2 py-1.5 hover:bg-orange-100 flex items-center gap-2"
                                >
                                  <span className="font-bold text-orange-700">{c.code}</span>
                                  <span className="text-gray-600 truncate">
                                    {c.description ||
                                      (c.discountType === "percentage"
                                        ? `${c.discountValue}% off`
                                        : `₹${c.discountValue} off`)}
                                    {c.minOrderAmount ? ` · min ₹${c.minOrderAmount}` : ""}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    <h3 className="font-bold text-sm mb-3">Bill Details</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Item Total</span>
                        <span className="font-semibold">₹{subtotal}</span>
                      </div>
                      {discount > 0 && appliedCoupon && (
                        <div className="flex justify-between text-green-700">
                          <span>Coupon ({appliedCoupon.code})</span>
                          <span className="font-semibold">- ₹{discount}</span>
                        </div>
                      )}
                      {orderType === "delivery" && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Delivery Fee</span>
                          <span className="font-semibold">₹{deliveryCharge}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600">GST & Other Charges (5%)</span>
                        <span className="font-semibold">₹{tax}</span>
                      </div>
                      <div className="border-t pt-3 flex justify-between text-lg">
                        <span className="font-bold">TO PAY</span>
                        <span className="font-bold text-orange-600">₹{total}</span>
                      </div>
                    </div>

                    <div className="mt-5 bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <p className="font-semibold text-sm">
                        Review your order and address details to avoid cancellations
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        Note: Please ensure your address and order details are correct. This order, if cancelled,
                        is non-refundable.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}





