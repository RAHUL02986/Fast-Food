"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { restaurantAPI, orderAPI } from "@/lib/api";
import { OwnerNav } from "@/components/Navs";
import Link from "next/link";
import { UtensilsCrossed, Calendar, TrendingUp, LogOut } from "lucide-react";

export default function OwnerDashboardImproved() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    preparingOrders: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
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
          const ordersData = await orderAPI.getOrders({ restaurantId: restData.data._id });
          const orders = ordersData.data || [];
          setRecentOrders(orders.slice(0, 5));
          setStats({
            totalOrders: orders.length,
            pendingOrders: orders.filter((o: any) => o.status === "placed" || o.status === "confirmed").length,
            preparingOrders: orders.filter((o: any) => o.status === "preparing").length,
          });
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) fetchData();
  }, [authLoading]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  if (authLoading || loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <OwnerNav />

      <div className="max-w-7xl mx-auto p-8">
        {!restaurant ? (
          <div className="bg-white p-12 rounded-lg shadow text-center">
            <UtensilsCrossed size={48} className="mx-auto text-gray-400 mb-4" />
            <h2 className="text-3xl font-bold mb-4">Welcome to Quick Food Owner Portal</h2>
            <p className="text-gray-600 mb-8 text-lg">Register your restaurant to get started and start receiving orders</p>
            <Link href="/owner/register-restaurant" className="bg-orange-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-orange-700 inline-block text-lg transition">
              Register Your Restaurant
            </Link>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="mb-8">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-4xl font-bold mb-2">{restaurant.name}</h1>
                  <div className="flex gap-4 items-center">
                    <p className={`text-sm font-semibold inline-block px-4 py-2 rounded-lg ${
                      restaurant.status === "approved" 
                        ? "bg-green-100 text-green-800" 
                        : "bg-yellow-100 text-yellow-800"
                    }`}>
                      {restaurant.status === "approved" ? "✓ Active" : "⏳ Pending Approval"}
                    </p>
                    {restaurant.rating && (
                      <p className="text-sm font-semibold">
                        ⭐ {restaurant.rating} ({restaurant.reviewCount} reviews)
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-6 mb-8">
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 border-l-4 border-orange-600 p-6 rounded-lg shadow hover:shadow-lg transition">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-gray-700 text-sm font-semibold mb-2">Total Orders</h3>
                    <p className="text-4xl font-bold text-orange-600">{stats.totalOrders}</p>
                  </div>
                  <UtensilsCrossed size={40} className="text-orange-400 opacity-30" />
                </div>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-600 p-6 rounded-lg shadow hover:shadow-lg transition">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-gray-700 text-sm font-semibold mb-2">Pending Orders</h3>
                    <p className="text-4xl font-bold text-blue-600">{stats.pendingOrders}</p>
                  </div>
                  <Calendar size={40} className="text-blue-400 opacity-30" />
                </div>
              </div>
              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-l-4 border-yellow-600 p-6 rounded-lg shadow hover:shadow-lg transition">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-gray-700 text-sm font-semibold mb-2">Preparing Orders</h3>
                    <p className="text-4xl font-bold text-yellow-600">{stats.preparingOrders}</p>
                  </div>
                  <TrendingUp size={40} className="text-yellow-400 opacity-30" />
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-3 gap-6 mb-8">
              <Link
                href="/owner/menu"
                className="bg-white border-2 border-orange-200 hover:border-orange-600 hover:shadow-lg p-6 rounded-lg transition text-center cursor-pointer"
              >
                <div className="text-3xl mb-2">📋</div>
                <h3 className="font-bold text-lg mb-2">Manage Menu</h3>
                <p className="text-gray-600 text-sm">Add, edit, or remove menu items</p>
              </Link>
              <Link
                href="/owner/bookings"
                className="bg-white border-2 border-blue-200 hover:border-blue-600 hover:shadow-lg p-6 rounded-lg transition text-center cursor-pointer"
              >
                <div className="text-3xl mb-2">🪑</div>
                <h3 className="font-bold text-lg mb-2">Manage Bookings</h3>
                <p className="text-gray-600 text-sm">View and manage table reservations</p>
              </Link>
              <Link
                href="/owner/analytics"
                className="bg-white border-2 border-green-200 hover:border-green-600 hover:shadow-lg p-6 rounded-lg transition text-center cursor-pointer"
              >
                <div className="text-3xl mb-2">📊</div>
                <h3 className="font-bold text-lg mb-2">View Analytics</h3>
                <p className="text-gray-600 text-sm">See revenue and performance metrics</p>
              </Link>
            </div>

            {/* Recent Orders */}
            <div className="bg-white p-8 rounded-lg shadow">
              <h2 className="text-2xl font-bold mb-6">Recent Orders</h2>
              {recentOrders.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg">No orders yet. Start accepting orders once approved!</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left py-3 px-4 font-semibold">Order #</th>
                        <th className="text-left py-3 px-4 font-semibold">Customer</th>
                        <th className="text-left py-3 px-4 font-semibold">Items</th>
                        <th className="text-left py-3 px-4 font-semibold">Amount</th>
                        <th className="text-left py-3 px-4 font-semibold">Status</th>
                        <th className="text-left py-3 px-4 font-semibold">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentOrders.map((order) => (
                        <tr key={order._id} className="border-b hover:bg-gray-50 transition">
                          <td className="py-3 px-4 font-semibold text-orange-600">{order.orderNumber}</td>
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-semibold">{order.customer?.name}</p>
                              <p className="text-xs text-gray-500">{order.customer?.phone}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm">{order.items?.length || 0} items</td>
                          <td className="py-3 px-4 font-bold">₹{order.total}</td>
                          <td className="py-3 px-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              order.status === "delivered" 
                                ? "bg-green-100 text-green-800" 
                                : order.status === "cancelled" 
                                ? "bg-red-100 text-red-800"
                                : order.status === "preparing"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-blue-100 text-blue-800"
                            }`}>
                              {order.status.replace("_", " ")}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {new Date(order.createdAt).toLocaleTimeString([], { 
                              hour: "2-digit", 
                              minute: "2-digit" 
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}