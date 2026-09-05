"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { bookingAPI } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { CustomerNav } from "@/components/Navs";
import Link from "next/link";
import { QrCode, CalendarDays, Users, Phone, XCircle, Clock } from "lucide-react";

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState<any[]>([]);
  const [newSlot, setNewSlot] = useState("");
  const [newDate, setNewDate] = useState("");
  const [showReschedule, setShowReschedule] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const data = await bookingAPI.getBookingById(params.id as string);
        setBooking(data.data);
      } catch (err: any) {
        setError(err.message || "Booking not found");
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchBooking();
  }, [params.id, user]);

  const loadSlots = async (date: string) => {
    try {
      const data = await bookingAPI.getAvailableSlots({
        restaurantId: booking.restaurant._id || booking.restaurant,
        date,
      });
      setSlots(data.data || []);
    } catch {
      setSlots([]);
    }
  };

  const handleReschedule = async () => {
    if (!newSlot) {
      alert("Pick a new slot first");
      return;
    }
    try {
      const res = await bookingAPI.rescheduleBooking(booking._id, { slot: newSlot });
      setBooking(res.data);
      setShowReschedule(false);
      setSlots([]);
      setNewDate("");
      setNewSlot("");
      alert("Booking rescheduled!");
    } catch (err: any) {
      alert(err.message || "Could not reschedule");
    }
  };

  const handleCancel = async () => {
    const reason = prompt("Enter cancellation reason:");
    if (!reason) return;
    try {
      await bookingAPI.cancelBooking(booking._id, { reason });
      const data = await bookingAPI.getBookingById(params.id as string);
      setBooking(data.data);
      alert(
        (booking.advanceAmount ?? 0) > 0
          ? `Booking cancelled — ₹${Math.round((booking.advanceAmount ?? 0) * 0.5)} refund (50% of your advance) has been initiated`
          : "Booking cancelled"
      );
    } catch (err: any) {
      alert(err.message || "Could not cancel booking");
    }
  };

  if (authLoading || loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading booking...</div>;
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8 text-center">
        <h1 className="text-2xl font-bold mb-2">Booking not found</h1>
        <p className="text-gray-600 mb-6">{error}</p>
        <Link href="/bookings" className="bg-orange-600 text-white px-6 py-2 rounded-lg font-bold">My Bookings</Link>
      </div>
    );
  }

  const tableUrl =
    booking.table?.qrCode && typeof window !== "undefined"
      ? `${window.location.origin}/table/${booking.table.qrCode}`
      : null;
  const qrImage = booking.bookingCode
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(tableUrl || booking.bookingCode)}`
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <CustomerNav />

      <div className="max-w-2xl mx-auto p-8">
        {/* Confirmation card */}
        <div className="bg-white p-8 rounded-lg shadow mb-6">
          <div className="flex justify-between items-start mb-6 gap-4">
            <div>
              <p className="text-green-600 font-bold text-sm uppercase tracking-wide mb-1">
                {booking.status === "confirmed" ? "Booking confirmed" : `Booking ${booking.status}`}
              </p>
              <h1 className="text-3xl font-bold">{booking.restaurant?.name}</h1>
              <p className="text-gray-600">Booking ID: <strong>{booking.bookingNumber}</strong></p>
            </div>
            {qrImage && (
              <div className="text-center bg-gray-50 border border-gray-200 rounded-lg p-3 shrink-0">
                <img src={qrImage} alt="Booking QR code" className="w-36 h-36" />
                <p className="text-xs text-gray-500 mt-2 flex items-center justify-center gap-1">
                  <QrCode size={12} /> {booking.bookingCode}
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="flex items-start gap-2">
              <CalendarDays size={18} className="text-orange-600 mt-0.5" />
              <div>
                <p className="text-gray-600 text-sm">Date</p>
                <p className="font-semibold">{new Date(booking.slot?.date).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Clock size={18} className="text-orange-600 mt-0.5" />
              <div>
                <p className="text-gray-600 text-sm">Time</p>
                <p className="font-semibold">{booking.slot?.startTime} – {booking.slot?.endTime}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Users size={18} className="text-orange-600 mt-0.5" />
              <div>
                <p className="text-gray-600 text-sm">Guests</p>
                <p className="font-semibold">{booking.partySize} people</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Phone size={18} className="text-orange-600 mt-0.5" />
              <div>
                <p className="text-gray-600 text-sm">Contact</p>
                <p className="font-semibold">{booking.guestName} · {booking.guestPhone}</p>
              </div>
            </div>
          </div>

          {/* Advance payment */}
          {(booking.advanceAmount ?? 0) > 0 && (
            <div
              className={`rounded-lg p-4 mb-4 text-sm border ${
                booking.advanceStatus === "refunded"
                  ? "bg-blue-50 border-blue-200"
                  : "bg-green-50 border-green-200"
              }`}
            >
              <p className="font-semibold">
                {booking.advanceStatus === "refunded"
                  ? `Advance refunded: ₹${booking.refundAmount ?? 0} (50% of ₹${booking.advanceAmount})`
                  : `Advance paid: ₹${booking.advanceAmount} via ${(booking.advancePaymentMethod ?? "card").toUpperCase()}`}
              </p>
              <p className="mt-1 text-gray-700">
                {booking.advanceStatus === "refunded"
                  ? "The refund has been initiated to your original payment method."
                  : "Adjusted against your final bill at the restaurant · 50% refundable on cancellation."}
              </p>
            </div>
          )}

          {booking.table && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4 text-sm">
              <p className="font-semibold text-orange-800">Assigned table: {booking.table.name}</p>
              <p className="text-orange-700 mt-1">
                On arrival, show this QR or{" "}
                {booking.table.qrCode && (
                  <Link href={`/table/${booking.table.qrCode}`} className="underline font-semibold">
                    open the table menu →
                  </Link>
                )}{" "}
                to order directly from your table.
              </p>
            </div>
          )}

          {booking.specialRequests && (
            <div className="bg-gray-50 p-3 rounded mb-4 text-sm">
              <strong>Special requests:</strong> {booking.specialRequests}
            </div>
          )}

          {booking.status === "confirmed" && (
            <div className="flex gap-3">
              <button
                onClick={() => setShowReschedule(!showReschedule)}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-bold py-2.5 rounded-lg transition"
              >
                Reschedule
              </button>
              <button
                onClick={handleCancel}
                className="flex-1 border-2 border-red-200 text-red-600 hover:bg-red-50 font-bold py-2.5 rounded-lg transition flex items-center justify-center gap-2"
              >
                <XCircle size={16} /> Cancel booking
              </button>
            </div>
          )}
        </div>

        {/* Reschedule panel */}
        {showReschedule && (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-lg font-bold mb-4">Pick a new date & slot</h2>
            <input
              type="date"
              value={newDate}
              onChange={(e) => {
                setNewDate(e.target.value);
                if (e.target.value) loadSlots(e.target.value);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <div className="flex flex-wrap gap-2 mb-4">
              {slots.map((slot: any) => (
                <button
                  key={slot._id}
                  type="button"
                  onClick={() => setNewSlot(slot._id)}
                  className={`px-4 py-2 rounded border-2 font-semibold text-sm ${
                    newSlot === slot._id ? "border-orange-600 bg-orange-50" : "border-gray-200"
                  }`}
                >
                  {slot.startTime}
                  <span className="block text-xs text-gray-500">{slot.capacity - slot.booked} seats left</span>
                </button>
              ))}
              {newDate && slots.length === 0 && (
                <p className="text-sm text-gray-500">No available slots on that date.</p>
              )}
            </div>
            <button
              onClick={handleReschedule}
              disabled={!newSlot}
              className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white font-bold py-2.5 px-6 rounded-lg transition"
            >
              Confirm new slot
            </button>
          </div>
        )}
      </div>
    </div>
  );
}