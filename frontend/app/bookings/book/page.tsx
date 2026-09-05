"use client";
import { Suspense, useEffect, useState } from "react";
import { restaurantAPI, bookingAPI } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { CustomerNav } from "@/components/Navs";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CreditCard, Smartphone, Wallet, ShieldCheck } from "lucide-react";

// Advance policy — MUST mirror the server-side calculation in bookingController.js
// (server always recomputes the final amount; this is display-only)
const ADVANCE_BASE = 200; // covers up to 2 guests
const ADVANCE_PER_EXTRA_GUEST = 50;
const MIN_PARTY_SIZE = 2;

const PAYMENT_METHODS = [
  { id: "card", label: "Card", icon: CreditCard },
  { id: "upi", label: "UPI", icon: Smartphone },
  { id: "wallet", label: "Wallet", icon: Wallet },
];

function BookRestaurantForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>(searchParams.get("restaurant") || "");
  const [selectedDate, setSelectedDate] = useState("");
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [formData, setFormData] = useState({
    partySize: "2",
    guestName: user?.name || "",
    guestPhone: user?.phone || "",
    specialRequests: "",
    advancePaymentMethod: "card",
  });
  const [loading, setLoading] = useState(false);

  const partySize = Math.max(MIN_PARTY_SIZE, parseInt(formData.partySize) || MIN_PARTY_SIZE);
  const extraGuests = Math.max(0, partySize - MIN_PARTY_SIZE);
  const advanceAmount = ADVANCE_BASE + extraGuests * ADVANCE_PER_EXTRA_GUEST;

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const data = await restaurantAPI.getAllRestaurants();
        setRestaurants(data.data || []);
      } catch (error) {
        console.error("Error fetching restaurants:", error);
      }
    };

    fetchRestaurants();
  }, []);

  useEffect(() => {
    const fetchSlots = async () => {
      if (selectedRestaurant && selectedDate) {
        try {
          const data = await bookingAPI.getAvailableSlots({
            restaurantId: selectedRestaurant,
            date: selectedDate,
          });

          setAvailableSlots(data.data || []);
        } catch (error) {
          console.error("Error fetching slots:", error);
        }
      }
    };

    fetchSlots();
  }, [selectedRestaurant, selectedDate]);

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      alert("Please login to book a table");
      router.push("/login");
      return;
    }

    if (!selectedSlot || !selectedRestaurant) {
      alert("Please select a restaurant and time slot");
      return;
    }

    setLoading(true);

    try {
      const res = await bookingAPI.createBooking({
        slot: selectedSlot,
        restaurant: selectedRestaurant,
        partySize,
        guestName: formData.guestName,
        guestPhone: formData.guestPhone,
        specialRequests: formData.specialRequests,
        advancePaymentMethod: formData.advancePaymentMethod,
      });

      alert(`Table booked! Advance of ₹${res.data.advanceAmount} paid via ${formData.advancePaymentMethod.toUpperCase()}.`);
      router.push(`/bookings/${res.data._id}`);
    } catch (error: any) {
      alert(error.message || "Error booking table");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <CustomerNav />

      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-8">Book a Table</h1>

        <form onSubmit={handleBooking} className="bg-white p-8 rounded-lg shadow space-y-6">
          {/* Step 1: Select Restaurant */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Select Restaurant *</label>
            <select
              value={selectedRestaurant}
              onChange={(e) => {
                setSelectedRestaurant(e.target.value);
                setSelectedDate("");
                setSelectedSlot("");
              }}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">-- Choose a restaurant --</option>
              {restaurants.map((restaurant) => (
                <option key={restaurant._id} value={restaurant._id}>
                  {restaurant.name} - {restaurant.location}
                </option>
              ))}
            </select>
          </div>

          {/* Step 2: Select Date */}
          {selectedRestaurant && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">Select Date *</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setSelectedSlot("");
                }}
                min={new Date().toISOString().split("T")[0]}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          )}

          {/* Step 3: Select Time Slot */}
          {selectedDate && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">Select Time Slot *</label>
              <div className="grid grid-cols-3 gap-3">
                {availableSlots.length === 0 ? (
                  <p className="col-span-3 text-gray-500">No available slots for this date</p>
                ) : (
                  availableSlots.map((slot) => (
                    <button
                      key={slot._id}
                      type="button"
                      onClick={() => setSelectedSlot(slot._id)}
                      className={`px-4 py-2 rounded border-2 font-semibold transition ${
                        selectedSlot === slot._id
                          ? "border-orange-600 bg-orange-50"
                          : "border-gray-300 hover:border-orange-600"
                      }`}
                    >
                      {slot.startTime}
                      <div className="text-xs text-gray-600">{slot.capacity - slot.booked} seats</div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Party Size */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Number of Guests *</label>
            <select
              value={formData.partySize}
              onChange={(e) => setFormData((prev) => ({ ...prev, partySize: e.target.value }))}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {[2, 3, 4, 5, 6, 7, 8, 10, 12].map((size) => (
                <option key={size} value={size}>
                  {size} Guest{size > 1 ? "s" : ""}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-2">Minimum 2 guests per table booking.</p>
          </div>

          {/* Guest Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Name *</label>
              <input
                type="text"
                value={formData.guestName}
                onChange={(e) => setFormData((prev) => ({ ...prev, guestName: e.target.value }))}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Phone *</label>
              <input
                type="tel"
                value={formData.guestPhone}
                onChange={(e) => setFormData((prev) => ({ ...prev, guestPhone: e.target.value }))}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          {/* Special Requests */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Special Requests</label>
            <textarea
              value={formData.specialRequests}
              onChange={(e) => setFormData((prev) => ({ ...prev, specialRequests: e.target.value }))}
              placeholder="e.g., Window seat, celebration setup..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Advance Payment */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900">Advance Payment</h3>
              <ShieldCheck size={18} className="text-green-600" />
            </div>
            <div className="space-y-1.5 text-sm text-gray-700 mb-3">
              <div className="flex justify-between">
                <span>Base advance (up to 2 guests)</span>
                <span className="font-semibold">₹{ADVANCE_BASE}</span>
              </div>
              <div className="flex justify-between">
                <span>Extra guests ({extraGuests} × ₹{ADVANCE_PER_EXTRA_GUEST})</span>
                <span className="font-semibold">₹{extraGuests * ADVANCE_PER_EXTRA_GUEST}</span>
              </div>
              <div className="flex justify-between border-t border-orange-200 pt-2 text-base">
                <span className="font-bold text-gray-900">Total advance</span>
                <span className="font-bold text-orange-600">₹{advanceAmount}</span>
              </div>
            </div>
            <p className="text-xs text-gray-600 mb-4">
              Paid now to confirm your table · adjusted against your final bill · 50% refunded if you cancel.
            </p>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Pay advance with</label>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, advancePaymentMethod: id }))}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 text-sm font-semibold transition ${
                    formData.advancePaymentMethod === id
                      ? "border-orange-600 bg-white text-orange-600"
                      : "border-gray-200 text-gray-600 hover:border-orange-300"
                  }`}
                >
                  <Icon size={16} /> {label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !selectedSlot}
            className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg transition"
          >
            {loading ? "Processing payment..." : `Pay ₹${advanceAmount} Advance & Confirm Booking`}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function BookRestaurantPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <BookRestaurantForm />
    </Suspense>
  );
}
