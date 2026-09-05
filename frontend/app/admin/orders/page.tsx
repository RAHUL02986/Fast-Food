"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { orderAPI } from "@/lib/api";
import { AdminNav } from "@/components/Navs";
import Link from "next/link";

export default function AdminOrders() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const data = await orderAPI.getOrders({
          status: filter === "all" ? undefined : filter,
        });
        setOrders(data.data || []);
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading && user?.role === "admin") fetchOrders();
  }, [authLoading, user, filter]);

  if (authLoading || loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />

      <div className="max-w-7xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-2">All Orders</h1>
        <p className="text-gray-500 text-sm mb-8">
          Read-only oversight — order management belongs to each restaurant owner.
        </p>

        {/* Filter Buttons */}
        <div className="flex gap-3 mb-8 flex-wrap">
          {["all", "placed", "confirmed", "preparing", "ready", "out_for_delivery", "delivered", "cancelled"].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded font-semibold text-sm ${
                filter === status
                  ? "bg-orange-600 text-white"
                  : "bg-white text-gray-700 border border-gray-300 hover:border-orange-600"
              }`}
            >
              {status.replace("_", " ").charAt(0).toUpperCase() + status.replace("_", " ").slice(1)}
            </button>
          ))}
        </div>

        {/* Orders List */}
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-6 py-3 font-semibold">Order #</th>
                <th className="text-left px-6 py-3 font-semibold">Customer</th>
                <th className="text-left px-6 py-3 font-semibold">Restaurant</th>
                <th className="text-left px-6 py-3 font-semibold">Items</th>
                <th className="text-left px-6 py-3 font-semibold">Amount</th>
                <th className="text-left px-6 py-3 font-semibold">Status</th>
                <th className="text-left px-6 py-3 font-semibold">Type</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    No orders found
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order._id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4 font-semibold">{order.orderNumber}</td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold">{order.customer?.name}</p>
                        <p className="text-sm text-gray-600">{order.customer?.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">{order.restaurant?.name}</td>
                    <td className="px-6 py-4 text-sm">{order.items?.length || 0} items</td>
                    <td className="px-6 py-4 font-semibold">₹{order.total}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded text-sm font-semibold ${
                          order.status === "delivered" || order.status === "served"
                            ? "bg-green-100 text-green-800"
                            : order.status === "cancelled"
                            ? "bg-red-100 text-red-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {order.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-xs">
                      {order.type === "dine-in" ? "Dine-in" : "Delivery"} · read-only
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
