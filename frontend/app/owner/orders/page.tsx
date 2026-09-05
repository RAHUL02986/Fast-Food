"use client";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { orderAPI } from "@/lib/api";
import { OwnerNav } from "@/components/Navs";
import { UtensilsCrossed, Bike, RefreshCw, Check, X } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  placed: "New", confirmed: "Accepted", preparing: "Preparing", ready: "Ready",
  out_for_delivery: "Out for delivery", delivered: "Delivered", served: "Served", cancelled: "Cancelled",
};

const STATUS_STYLES: Record<string, string> = {
  placed: "bg-blue-100 text-blue-800", confirmed: "bg-indigo-100 text-indigo-800",
  preparing: "bg-yellow-100 text-yellow-800", ready: "bg-purple-100 text-purple-800",
  out_for_delivery: "bg-orange-100 text-orange-800", delivered: "bg-green-100 text-green-800",
  served: "bg-green-100 text-green-800", cancelled: "bg-red-100 text-red-800",
};

// Next statuses an owner can move an order to
const NEXT_STATUS: Record<string, string[]> = {
  placed: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["ready"],
  ready: ["out_for_delivery", "served"],
  out_for_delivery: ["delivered"],
  delivered: [], served: [], cancelled: [],
};

export default function OwnerOrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"live" | "history">("live");

  const fetchData = useCallback(async () => {
    try {
      const [ordersData, summaryData] = await Promise.all([
        orderAPI.getOrders({}),
        orderAPI.getDailySummary().catch(() => null),
      ]);
      setOrders(ordersData.data || []);
      setSummary(summaryData?.data || null);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "owner")) router.push("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!authLoading && user?.role === "owner") fetchData();
  }, [authLoading, user, fetchData]);

  useEffect(() => {
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const setStatus = async (orderId: string, status: string) => {
    try {
      await orderAPI.updateOrderStatus(orderId, { status });
      fetchData();
    } catch (error: any) {
      alert(error.message || "Error updating status");
    }
  };

  const reject = async (orderId: string) => {
    const reason = prompt("Reason for rejecting this order:");
    if (reason === null) return;
    try {
      await orderAPI.rejectOrder(orderId, { reason });
      fetchData();
    } catch (error: any) {
      alert(error.message || "Error rejecting order");
    }
  };

  if (authLoading || loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading orders...</div>;
  }

  const liveOrders = orders.filter((o: any) =>
    ["placed", "confirmed", "preparing", "ready", "out_for_delivery"].includes(o.status)
  );
  const pastOrders = orders.filter((o: any) => !liveOrders.includes(o));
  const visible = tab === "live" ? liveOrders : pastOrders;

  return (
    <div className="min-h-screen bg-gray-50">
      <OwnerNav />

      <div className="max-w-7xl mx-auto p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Live Orders</h1>
          <button onClick={fetchData} className="flex items-center gap-2 bg-white border border-gray-300 px-4 py-2 rounded-lg text-sm font-semibold hover:border-orange-600">
            <RefreshCw size={15} /> Refresh
          </button>
        </div>

        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            {[
              { label: "Orders today", value: summary.ordersToday },
              { label: "Revenue today", value: `₹${summary.revenueToday}` },
              { label: "Delivery", value: summary.deliveryOrders },
              { label: "Dine-in", value: summary.dineInOrders },
              { label: "Bookings today", value: summary.bookingsToday },
            ].map((stat) => (
              <div key={stat.label} className="bg-white p-4 rounded-lg shadow">
                <p className="text-gray-600 text-xs font-semibold mb-1">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3 mb-6">
          <button onClick={() => setTab("live")} className={`px-4 py-2 rounded font-semibold ${tab === "live" ? "bg-orange-600 text-white" : "bg-white border border-gray-300"}`}>
            Live queue ({liveOrders.length})
          </button>
          <button onClick={() => setTab("history")} className={`px-4 py-2 rounded font-semibold ${tab === "history" ? "bg-orange-600 text-white" : "bg-white border border-gray-300"}`}>
            History ({pastOrders.length})
          </button>
        </div>

        {visible.length === 0 ? (
          <div className="bg-white p-10 rounded-lg shadow text-center text-gray-500">
            {tab === "live" ? "No live orders right now." : "No past orders."}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {visible.map((order: any) => (
              <div key={order._id} className="bg-white p-5 rounded-lg shadow">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      {order.type === "dine-in" ? (
                        <span className="flex items-center gap-1 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-semibold">
                          <UtensilsCrossed size={11} /> Dine-in{order.table?.name ? ` · ${order.table.name}` : ""}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                          <Bike size={11} /> Delivery
                        </span>
                      )}
                      <span className="font-bold">{order.orderNumber}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{order.customer?.name} · {order.customer?.phone}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[order.status] || "bg-gray-100"}`}>
                    {STATUS_LABELS[order.status] || order.status}
                  </span>
                </div>

                <div className="border-t pt-3 mb-3 space-y-1">
                  {order.items?.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between text-sm text-gray-700">
                      <span>{item.menuItem?.name || "Item"} × {item.quantity}</span>
                      <span>₹{item.price * item.quantity}</span>
                    </div>
                  ))}
                  {order.type === "delivery" && order.deliveryAddress?.street && (
                    <p className="text-xs text-gray-500 pt-1">📍 {order.deliveryAddress.street}, {order.deliveryAddress.city}</p>
                  )}
                  <div className="flex justify-between font-bold text-sm pt-1">
                    <span>Total</span>
                    <span className="text-orange-600">₹{order.total}</span>
                  </div>
                </div>

                {NEXT_STATUS[order.status]?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {order.status === "placed" && (
                      <button onClick={() => setStatus(order._id, "confirmed")} className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-sm font-bold px-4 py-2 rounded-lg">
                        <Check size={14} /> Accept
                      </button>
                    )}
                    {NEXT_STATUS[order.status].filter((s) => s !== "cancelled").map((s) => (
                      <button key={s} onClick={() => setStatus(order._id, s)} className="bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold px-4 py-2 rounded-lg">
                        Mark {STATUS_LABELS[s]}
                      </button>
                    ))}
                    {NEXT_STATUS[order.status].includes("cancelled") && (
                      <button onClick={() => reject(order._id)} className="flex items-center gap-1 border-2 border-red-200 text-red-600 hover:bg-red-50 text-sm font-bold px-4 py-2 rounded-lg">
                        <X size={14} /> Reject
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}