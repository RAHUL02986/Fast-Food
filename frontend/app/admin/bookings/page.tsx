"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { adminAPI } from "@/lib/api";
import { AdminNav } from "@/components/Navs";

const STATUS_STYLES: Record<string, string> = {
  confirmed: "bg-blue-100 text-blue-800",
  cancelled: "bg-red-100 text-red-800",
  completed: "bg-green-100 text-green-800",
  "no-show": "bg-yellow-100 text-yellow-800",
};

export default function AdminBookingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) router.push("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const data = await adminAPI.getBookings({ status: status || undefined });
        setBookings(data.data || []);
      } catch (error) {
        console.error("Error fetching bookings:", error);
      } finally {
        setLoading(false);
      }
    };
    if (!authLoading && user?.role === "admin") fetchBookings();
  }, [authLoading, user, status]);

  if (authLoading || loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading bookings...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <div className="max-w-7xl mx-auto p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">All Bookings <span className="text-sm font-normal text-gray-500">(read-only oversight)</span></h1>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg">
            <option value="">All statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="no-show">No-show</option>
          </select>
        </div>

        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left">
                <th className="py-3 px-4 font-semibold">Booking</th>
                <th className="py-3 px-4 font-semibold">Restaurant</th>
                <th className="py-3 px-4 font-semibold">Customer</th>
                <th className="py-3 px-4 font-semibold">Guests</th>
                <th className="py-3 px-4 font-semibold">Date & Time</th>
                <th className="py-3 px-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b: any) => (
                <tr key={b._id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-4 font-semibold text-orange-600">{b.bookingNumber}</td>
                  <td className="py-3 px-4">{b.restaurant?.name}</td>
                  <td className="py-3 px-4">
                    {b.customer?.name}
                    <span className="block text-xs text-gray-500">{b.customer?.phone}</span>
                  </td>
                  <td className="py-3 px-4">{b.partySize}</td>
                  <td className="py-3 px-4">
                    {new Date(b.slot?.date).toLocaleDateString()} · {b.slot?.startTime}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[b.status] || "bg-gray-100"}`}>
                      {b.status}
                    </span>
                  </td>
                </tr>
              ))}
              {bookings.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-gray-500">No bookings found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}