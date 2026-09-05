"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { OwnerNav } from "@/components/Navs";
import { bookingAPI, restaurantAPI } from "@/lib/api";
import Link from "next/link";

export default function BookingManagement() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "owner")) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const restData = await restaurantAPI.getOwnerRestaurant();
        setRestaurant(restData.data);

        if (restData.data) {
          const bookingsData = await bookingAPI.getBookings({ restaurantId: restData.data._id });
          setBookings(bookingsData.data || []);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) fetchData();
  }, [authLoading]);

  const updateBookingStatus = async (bookingId: string, newStatus: string) => {
    try {
      await bookingAPI.updateBookingStatus(bookingId, { status: newStatus });
      setBookings((prev) =>
        prev.map((b) => (b._id === bookingId ? { ...b, status: newStatus } : b))
      );
      alert("Booking status updated");
    } catch (error: any) {
      alert(error.message || "Error updating booking");
    }
  };

  if (authLoading || loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <OwnerNav />

      <div className="max-w-7xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-8">Table Bookings</h1>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold">All Bookings</h2>
          </div>
          <div className="divide-y">
            {bookings.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No bookings yet</div>
            ) : (
              bookings.map((booking: any) => (
                <div key={booking._id} className="p-6 hover:bg-gray-50">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-bold text-lg">{booking.bookingNumber}</p>
                      <p className="text-gray-600">{booking.guestName} • {booking.partySize} guests</p>
                      <p className="text-sm text-gray-500">{booking.guestPhone}</p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded text-sm font-semibold ${
                        booking.status === "completed"
                          ? "bg-green-100 text-green-800"
                          : booking.status === "cancelled"
                          ? "bg-red-100 text-red-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {booking.status}
                    </span>
                  </div>

                  <div className="bg-gray-50 p-3 rounded mb-3">
                    <p className="text-sm text-gray-700">
                      📅 {new Date(booking.slot?.date).toLocaleDateString()} at {booking.slot?.startTime}
                    </p>
                    {booking.specialRequests && (
                      <p className="text-sm text-gray-600 mt-1">Notes: {booking.specialRequests}</p>
                    )}
                  </div>

                  {booking.status === "confirmed" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateBookingStatus(booking._id, "completed")}
                        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm"
                      >
                        Mark as Completed
                      </button>
                      <button
                        onClick={() => updateBookingStatus(booking._id, "no-show")}
                        className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 text-sm"
                      >
                        No Show
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
