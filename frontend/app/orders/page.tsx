"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { orderAPI } from "@/lib/api";
import type { Order, OrderItem } from "@/types";
import { CustomerNav } from "@/components/Navs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Utensils, Bike } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  placed: "bg-blue-100 text-blue-800",
  confirmed: "bg-blue-100 text-blue-800",
  preparing: "bg-yellow-100 text-yellow-800",
  ready: "bg-purple-100 text-purple-800",
  out_for_delivery: "bg-orange-100 text-orange-800",
  delivered: "bg-green-100 text-green-800",
  served: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<string, string> = {
  placed: "Placed",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  served: "Served",
  cancelled: "Cancelled",
};

// List endpoints populate items.menuItem (name only); the helper keeps an "Item"
// fallback for edge cases like menu items deleted after the order was placed.
const itemLabel = (menuItem: OrderItem["menuItem"]) =>
  typeof menuItem === "object" && menuItem !== null ? menuItem.name : "Item";

export default function OrderHistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const data = await orderAPI.getOrders(filter === "all" ? {} : { type: filter });
        setOrders(data.data || []);
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setLoading(false);
      }
    };
    if (!authLoading && user) fetchOrders();
  }, [authLoading, user, filter]);

  if (authLoading || loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading orders...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CustomerNav />

      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-6">Order History</h1>

        <div className="flex gap-3 mb-6">
          {[{ id: "all", label: "All" }, { id: "delivery", label: "Delivery" }, { id: "dine-in", label: "Dine-in" }].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-4 py-2 rounded font-semibold ${
                filter === f.id
                  ? "bg-orange-600 text-white"
                  : "bg-white text-gray-700 border border-gray-300 hover:border-orange-600"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {orders.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow text-center">
            <p className="text-gray-600 mb-4">No orders yet.</p>
            <Link href="/restaurants" className="bg-orange-600 text-white px-6 py-2 rounded font-bold hover:bg-orange-700 inline-block">
              Browse Restaurants
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order: any) => (
              <Link key={order._id} href={`/orders/${order._id}`} className="block bg-white p-6 rounded-lg shadow hover:shadow-md transition">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      {order.type === "dine-in" ? (
                        <span className="flex items-center gap-1 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-semibold">
                          <Utensils size={11} /> Dine-in{order.table?.name ? ` · ${order.table.name}` : ""}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                          <Bike size={11} /> Delivery
                        </span>
                      )}
                      <span className="font-bold text-orange-600">{order.orderNumber}</span>
                    </div>
                    <p className="text-gray-600 text-sm mt-1">{order.restaurant?.name}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{order.createdAt ? new Date(order.createdAt).toLocaleString() : ""}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[order.status] || "bg-gray-100"}`}>
                      {STATUS_LABELS[order.status] || order.status}
                    </span>
                    <p className="font-bold text-lg mt-2">₹{order.total}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {order.items?.slice(0, 4).map((item: OrderItem, i: number) => (
                    <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                      {itemLabel(item.menuItem)} × {item.quantity}
                    </span>
                  ))}
                  {(order.items?.length || 0) > 4 && (
                    <span className="text-xs text-gray-500 px-1 py-1">+{(order.items?.length ?? 0) - 4} more</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}