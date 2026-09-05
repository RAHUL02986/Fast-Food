"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { restaurantAPI, orderAPI } from "@/lib/api";
import { CustomerNav } from "@/components/Navs";
import Link from "next/link";

export default function CustomerDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "customer")) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const ordersData = await orderAPI.getOrders();
        setOrders(ordersData.data || []);
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) fetchData();
  }, [authLoading]);

  if (authLoading || loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CustomerNav />

      <div className="max-w-7xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-8">My Orders & Bookings</h1>

        {/* My Orders */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold">Recent Orders</h2>
          </div>
          <div className="divide-y">
            {orders.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No orders yet. <Link href="/" className="text-orange-600 hover:underline">Browse restaurants</Link>
              </div>
            ) : (
              orders.slice(0, 5).map((order: any) => (
                <div key={order._id} className="p-6 flex justify-between items-center hover:bg-gray-50">
                  <div>
                    <p className="font-bold">{order.orderNumber}</p>
                    <p className="text-gray-600">{order.restaurant?.name} • {order.items.length} items</p>
                    <p className="text-sm text-gray-500">₹{order.total} • {new Date(order.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded text-sm font-semibold ${
                      order.status === "delivered" ? "bg-green-100 text-green-800" :
                      order.status === "cancelled" ? "bg-red-100 text-red-800" :
                      "bg-blue-100 text-blue-800"
                    }`}>
                      {order.status}
                    </span>
                    <Link href={`/orders/${order._id}`} className="text-orange-600 hover:underline">
                      View Details
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="text-center flex gap-4 justify-center">
          <Link href="/orders" className="border-2 border-orange-600 text-orange-600 px-6 py-3 rounded-lg font-bold hover:bg-orange-50 inline-block">
            View Full Order History
          </Link>
          <Link href="/" className="bg-orange-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-orange-700 inline-block">
            Order More Food
          </Link>
        </div>
      </div>
    </div>
  );
}
