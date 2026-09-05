"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { analyticsAPI } from "@/lib/api";
import { AdminNav } from "@/components/Navs";

// Backend aggregations return [{ _id: status, count }] — these give human-readable labels
const STATUS_LABELS: Record<string, string> = {
  placed: "Placed",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  served: "Served",
  cancelled: "Cancelled",
  completed: "Completed",
  "no-show": "No-show",
};

export default function AdminAnalytics() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [dashboard, orders, bookings] = await Promise.all([
          analyticsAPI.getAdminDashboard(),
          analyticsAPI.getOrderAnalytics(),
          analyticsAPI.getBookingAnalytics(),
        ]);

        setAnalytics({
          dashboard: dashboard.data,
          orders: orders.data,
          bookings: bookings.data,
        });
      } catch (error) {
        console.error("Error fetching analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) fetchAnalytics();
  }, [authLoading]);

  if (authLoading || loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />

      <div className="max-w-7xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-8">Platform Analytics</h1>

        {/* Dashboard Stats */}
        {analytics?.dashboard && (
          <>
            <div className="grid grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-gray-600 text-sm font-semibold mb-2">Total Orders</h3>
                <p className="text-3xl font-bold">{analytics.dashboard.stats?.totalOrders || 0}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-gray-600 text-sm font-semibold mb-2">Total Bookings</h3>
                <p className="text-3xl font-bold">{analytics.dashboard.stats?.totalBookings || 0}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-gray-600 text-sm font-semibold mb-2">Total Restaurants</h3>
                <p className="text-3xl font-bold">{analytics.dashboard.stats?.totalRestaurants || 0}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-gray-600 text-sm font-semibold mb-2">Total Revenue</h3>
                <p className="text-3xl font-bold">₹{analytics.dashboard.stats?.totalRevenue || 0}</p>
              </div>
            </div>

            {/* Monthly Trends */}
            {analytics.dashboard.monthlyOrders && analytics.dashboard.monthlyOrders.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow mb-8">
                <h2 className="text-xl font-bold mb-4">Monthly Trends</h2>
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Month</th>
                      <th className="text-right py-2">Orders</th>
                      <th className="text-right py-2">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.dashboard.monthlyOrders.map((trend: any, index: number) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="py-3">
                          {new Date(trend._id.year, trend._id.month - 1).toLocaleDateString("en-US", {
                            month: "long",
                            year: "numeric",
                          })}
                        </td>
                        <td className="text-right">{trend.count}</td>
                        <td className="text-right">₹{trend.revenue}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* Order Analytics */}
        {analytics?.orders && (
          <div className="bg-white p-6 rounded-lg shadow mb-8">
            <h2 className="text-xl font-bold mb-4">Order Analytics</h2>
            <div className="grid grid-cols-2 gap-6">
              {/* Status Breakdown */}
              <div>
                <h3 className="font-semibold mb-3">Orders by Status</h3>
                <table className="w-full text-sm">
                  <tbody>
                    {(analytics.orders.statusBreakdown || []).length === 0 ? (
                      <tr>
                        <td className="py-2 text-gray-500">No orders yet</td>
                      </tr>
                    ) : (
                      analytics.orders.statusBreakdown.map(({ _id: status, count }: any) => (
                        <tr key={status} className="border-b">
                          <td className="py-2">{STATUS_LABELS[status] || status}</td>
                          <td className="text-right font-semibold">{count}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Top Restaurants */}
              <div>
                <h3 className="font-semibold mb-3">Top Restaurants by Revenue</h3>
                <table className="w-full text-sm">
                  <tbody>
                    {(analytics.orders.topRestaurants || []).slice(0, 5).map((rest: any) => (
                      <tr key={rest._id} className="border-b">
                        <td className="py-2">{rest.restaurant?.[0]?.name || "Unknown"}</td>
                        <td className="text-right font-semibold">₹{rest.revenue}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Booking Analytics */}
        {analytics?.bookings && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Booking Analytics</h2>
            <div className="grid grid-cols-2 gap-6">
              {/* Status Breakdown */}
              <div>
                <h3 className="font-semibold mb-3">Bookings by Status</h3>
                <table className="w-full text-sm">
                  <tbody>
                    {(analytics.bookings.statusBreakdown || []).length === 0 ? (
                      <tr>
                        <td className="py-2 text-gray-500">No bookings yet</td>
                      </tr>
                    ) : (
                      analytics.bookings.statusBreakdown.map(({ _id: status, count }: any) => (
                        <tr key={status} className="border-b">
                          <td className="py-2">{STATUS_LABELS[status] || status}</td>
                          <td className="text-right font-semibold">{count}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Top Restaurants for Bookings */}
              <div>
                <h3 className="font-semibold mb-3">Top Restaurants for Bookings</h3>
                <table className="w-full text-sm">
                  <tbody>
                    {(analytics.bookings.topBookedRestaurants || []).slice(0, 5).map((rest: any) => (
                      <tr key={rest._id} className="border-b">
                        <td className="py-2">{rest.restaurant?.[0]?.name || "Unknown"}</td>
                        <td className="text-right font-semibold">{rest.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
