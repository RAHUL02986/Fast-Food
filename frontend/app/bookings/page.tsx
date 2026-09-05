"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { bookingAPI } from "@/lib/api";
import { CustomerNav } from "@/components/Navs";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function MyBookings() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelTarget, setCancelTarget] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const data = await bookingAPI.getBookings();
        setBookings(data.data || []);
      } catch (error) {
        console.error("Error fetching bookings:", error);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) fetchBookings();
  }, [authLoading]);

  const openCancelModal = (booking: any) => {
    setCancelTarget(booking);
    setCancelReason("");
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    const reason = cancelReason.trim() || "Changed my plans";
    try {
      setCancelling(true);
      await bookingAPI.cancelBooking(cancelTarget._id, { reason });
      setBookings((prev) => prev.map((b) => (b._id === cancelTarget._id ? { ...b, status: "cancelled" } : b)));
      setCancelTarget(null);
    } catch (error: any) {
      alert(error.message || "Error cancelling booking");
    } finally {
      setCancelling(false);
    }
  };

  if (authLoading || loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CustomerNav />

      <div className="max-w-7xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-8">My Table Bookings</h1>

        {bookings.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow text-center">
            <p className="text-gray-600 mb-4">You haven't booked any tables yet</p>
            <Link href="/bookings/book" className="bg-orange-600 text-white px-6 py-2 rounded font-bold hover:bg-orange-700 inline-block">
              Book a Table
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking: any) => (
              <div key={booking._id} className="bg-white p-6 rounded-lg shadow hover:shadow-md transition">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold">{booking.restaurant?.name}</h3>
                    <p className="text-gray-600">{booking.bookingNumber}</p>
                  </div>
                  <span
                    className={`px-4 py-2 rounded font-semibold ${
                      booking.status === "completed"
                        ? "bg-green-100 text-green-800"
                        : booking.status === "cancelled"
                        ? "bg-red-100 text-red-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-4 mb-4">
                  <div>
                    <p className="text-gray-600 text-sm">Date & Time</p>
                    <p className="font-semibold">
                      {new Date(booking.slot?.date).toLocaleDateString()} at {booking.slot?.startTime}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Party Size</p>
                    <p className="font-semibold">{booking.partySize} guests</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Name</p>
                    <p className="font-semibold">{booking.guestName}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Phone</p>
                    <p className="font-semibold">{booking.guestPhone}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Advance</p>
                    <p className="font-semibold">
                      ₹{booking.advanceAmount || 0}{" "}
                      <span
                        className={`text-xs font-semibold ${
                          booking.advanceStatus === "refunded" ? "text-blue-600" : "text-green-600"
                        }`}
                      >
                        {booking.advanceStatus === "refunded"
                          ? `₹${booking.refundAmount ?? Math.round((booking.advanceAmount ?? 0) / 2)} refunded`
                          : "paid"}
                      </span>
                    </p>
                  </div>
                </div>

                {booking.specialRequests && (
                  <div className="bg-gray-50 p-3 rounded mb-4">
                    <p className="text-sm text-gray-700"><strong>Special Requests:</strong> {booking.specialRequests}</p>
                  </div>
                )}

                {booking.status === "confirmed" && (
                  <div className="flex gap-3">
                    <Link
                      href={`/bookings/${booking._id}`}
                      className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 font-semibold text-sm"
                    >
                      View QR & details
                    </Link>
                    <Link
                      href={`/bookings/${booking._id}`}
                      className="border-2 border-orange-200 text-orange-600 px-4 py-2 rounded hover:bg-orange-50 font-semibold text-sm"
                    >
                      Reschedule
                    </Link>
                    <button
                      onClick={() => openCancelModal(booking)}
                      className="border-2 border-red-200 text-red-600 px-4 py-2 rounded hover:bg-red-50 font-semibold text-sm"
                    >
                      Cancel Booking
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cancel confirmation modal */}
      {cancelTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => !cancelling && setCancelTarget(null)}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-2">Cancel this booking?</h2>
            <p className="text-gray-600 text-sm mb-3">
              <strong>{cancelTarget.guestName}</strong> · {cancelTarget.partySize} guests · Table {cancelTarget.table?.name || "—"}
            </p>
            {(cancelTarget.advanceAmount ?? 0) > 0 && (
              <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded p-2 mb-4">
                50% of your advance is refundable: ₹{Math.round((cancelTarget.advanceAmount ?? 0) * 0.5)} of ₹
                {cancelTarget.advanceAmount} will be returned to your {cancelTarget.advancePaymentMethod ?? "card"}.
              </p>
            )}
            <label className="block text-sm font-semibold text-gray-700 mb-2">Reason (optional)</label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Changed my plans"
              rows={3}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 mb-4"
              autoFocus
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setCancelTarget(null)}
                disabled={cancelling}
                className="px-4 py-2 rounded-lg border-2 border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 disabled:opacity-50"
              >
                Keep booking
              </button>
              <button
                onClick={confirmCancel}
                disabled={cancelling}
                className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {cancelling ? "Cancelling..." : "Yes, cancel booking"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
