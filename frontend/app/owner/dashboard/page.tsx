"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { restaurantAPI, orderAPI, analyticsAPI } from "@/lib/api";
import { OwnerNav } from "@/components/Navs";
import Link from "next/link";
import { UtensilsCrossed, ShoppingBag, Calendar, TrendingUp, IndianRupee, Clock, CheckCircle, Plus, ChevronRight, Star, Package, Ticket } from "lucide-react";
import type { Restaurant, Order, MenuItem } from "@/types";

interface OwnerAnalytics {
  stats?: {
    revenue?: number;
    totalOrders?: number;
  };
  monthlyOrders?: Array<{
    _id: { month: number; year: number };
    count: number;
    revenue: number;
  }>;
  topMenuItems?: Array<{
    _id: string;
    name: string;
    count: number;
    revenue: number;
  }>;
}

export default function OwnerDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [bookings, setBookings] = useState([]);
  const [analytics, setAnalytics] = useState<OwnerAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "owner")) router.push("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const restData = await restaurantAPI.getOwnerRestaurant();
        setRestaurant(restData.data);
        if (restData.data) {
          const [ordersData, analyticsData] = await Promise.all([
            orderAPI.getOrders({ restaurantId: restData.data._id }),
            analyticsAPI.getRestaurantAnalytics(restData.data._id)
          ]);
          setOrders((ordersData.data as Order[]) || []);
          setAnalytics(analyticsData.data as OwnerAnalytics);
        }
      } catch (e: unknown) { console.error(e); } finally { setLoading(false); }
    };
    if (!authLoading) fetchData();
  }, [authLoading]);

  const fmt = (n: number) => "\u20B9" + (n || 0).toLocaleString("en-IN");
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const orderStatusClr = (s: string) => {
    switch(s) {
      case "delivered": case "served": return "bg-green-100 text-green-800";
      case "cancelled": return "bg-red-100 text-red-800";
      case "preparing": case "confirmed": return "bg-blue-100 text-blue-800";
      case "placed": return "bg-yellow-100 text-yellow-800";
      case "out_for_delivery": case "ready": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (authLoading || loading) return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-orange-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600 font-medium">Loading dashboard...</p>
      </div>
    </div>
  );

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-orange-50">
        <OwnerNav />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <UtensilsCrossed size={48} className="mx-auto text-gray-400 mb-4" />
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Welcome to Quick Food Owner Portal</h2>
            <p className="text-gray-600 mb-8 text-lg">Register your restaurant to get started and start receiving orders</p>
            <Link href="/owner/register-restaurant" className="bg-orange-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-orange-700 inline-block text-lg transition">Register Your Restaurant</Link>
          </div>
        </div>
      </div>
    );
  }

  const stats = [
    { label: "Total Revenue", value: fmt(analytics?.stats?.revenue ?? 0), I: IndianRupee, color: "#16a34a", bg: "bg-green-50", ch: "+8.3%" },
    { label: "Total Orders", value: orders.length, I: ShoppingBag, color: "#2563eb", bg: "bg-blue-50", ch: "+12" },
    { label: "Pending Orders", value: orders.filter(o => o.status === "placed" || o.status === "confirmed").length, I: Clock, color: "#ca8a04", bg: "bg-amber-50", ch: "" },
    { label: "Preparing", value: orders.filter(o => o.status === "preparing").length, I: Package, color: "#9333ea", bg: "bg-purple-50", ch: "" },
  ];

  const quickActions = [
    { l: "View Orders", h: "/owner/orders", i: ShoppingBag, c: "bg-blue-600" },
    { l: "Manage Menu", h: "/owner/menu", i: UtensilsCrossed, c: "bg-orange-600" },
    { l: "Coupons", h: "/owner/coupons", i: Ticket, c: "bg-rose-600" },
    { l: "Tables", h: "/owner/tables", i: Calendar, c: "bg-green-600" },
    { l: "Bookings", h: "/owner/bookings", i: Calendar, c: "bg-purple-600" },
    { l: "Analytics", h: "/owner/analytics", i: TrendingUp, c: "bg-cyan-600" },
    { l: "Add Item", h: "/owner/menu?action=add", i: Plus, c: "bg-pink-600" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-orange-50">
      <OwnerNav />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{restaurant.name}</h1>
              <div className="flex items-center gap-3 mt-2">
                <p className={`text-sm font-semibold inline-block px-3 py-1 rounded-lg ${restaurant.status === "approved" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                  {restaurant.status === "approved" ? "\u2713 Active" : "\u23F3 Pending Approval"}
                </p>
                {restaurant.rating && restaurant.rating > 0 && (
                  <span className="flex items-center gap-1 text-sm text-gray-600"><Star size={14} className="text-yellow-500" fill="currentColor" /> {restaurant.rating.toFixed(1)} ({restaurant.reviewCount || 0} reviews)</span>
                )}
              </div>
              <p className="text-gray-500 text-sm mt-1">{restaurant.cuisine?.join(", ")} | {restaurant.location}{restaurant.city ? `, ${restaurant.city}` : ""}</p>
            </div>
            <Link href="/owner/register-restaurant" className="bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-orange-700 transition text-sm">Edit Restaurant</Link>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((s, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{s.label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{s.value}</p>
                  {s.ch && (
                    <div className="flex items-center gap-1 mt-2">
                      <TrendingUp size={14} className="text-green-500" />
                      <span className="text-xs font-medium text-green-600">{s.ch}</span>
                      <span className="text-xs text-gray-400">vs last month</span>
                    </div>
                  )}
                </div>
                <div className={`p-3 rounded-xl ${s.bg}`}>
                  <s.I size={24} style={{ color: s.color }} />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {quickActions.map((a, i) => (
              <Link key={i} href={a.h} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md hover:border-orange-200 transition-all text-center group">
                <div className={`${a.c} w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform`}>
                  <a.i size={22} className="text-white" />
                </div>
                <p className="text-sm font-medium text-gray-700">{a.l}</p>
              </Link>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg"><ShoppingBag size={20} className="text-blue-600" /></div>
                <div><h3 className="text-lg font-bold text-gray-900">Recent Orders</h3><p className="text-sm text-gray-500">Latest {Math.min(orders.length, 5)} orders</p></div>
              </div>
              <Link href="/owner/orders" className="text-orange-600 text-sm flex items-center gap-1">View all <ChevronRight size={16} /></Link>
            </div>
            <div className="divide-y divide-gray-50">
              {orders.length === 0 ? (
                <div className="p-8 text-center"><ShoppingBag size={32} className="mx-auto text-gray-300 mb-2" /><p className="text-gray-500">No orders yet. Start accepting orders once approved!</p></div>
              ) : orders.slice(0, 5).map((o) => (
                <div key={o._id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-orange-600">{o.orderNumber}</p>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${orderStatusClr(o.status)}`}>{o.status?.replace(/_/g, " ")}</span>
                      </div>
                      <p className="text-sm text-gray-600 truncate">{o.items?.length || 0} items | {typeof o.customer === "object" ? o.customer?.name : o.customer || "Customer"}</p>
                      <p className="text-xs text-gray-400 mt-1">{fmtDate(o.createdAt ?? "")}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold">\u20B9{o.total?.toLocaleString()}</p>
                      <Link href={`/orders/${o._id}`} className="text-xs text-orange-600 hover:underline">View</Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded-lg"><TrendingUp size={20} className="text-green-600" /></div>
                <div><h3 className="text-lg font-bold text-gray-900">Top Menu Items</h3><p className="text-sm text-gray-500">By order count</p></div>
              </div>
              <Link href="/owner/menu" className="text-orange-600 text-sm flex items-center gap-1">Manage <ChevronRight size={16} /></Link>
            </div>
            <div className="divide-y divide-gray-50">
              {!analytics?.topMenuItems || analytics.topMenuItems.length === 0 ? (
                <div className="p-8 text-center"><UtensilsCrossed size={32} className="mx-auto text-gray-300 mb-2" /><p className="text-gray-500">No menu data yet</p></div>
              ) : analytics.topMenuItems.slice(0, 5).map((item: { _id: string; name?: string; count: number; revenue?: number; item?: Array<{ name?: string }> }, idx: number) => (
                <div key={idx} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{item.item?.[0]?.name || "Unknown Item"}</p>
                      <p className="text-sm text-gray-500">{item.count} orders</p>
                    </div>
                    <div className="text-right shrink-0"><p className="font-bold">\u20B9{item.revenue?.toLocaleString()}</p></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 rounded-lg"><Calendar size={20} className="text-purple-600" /></div>
                <div><h3 className="text-lg font-bold text-gray-900">Restaurant Details</h3><p className="text-sm text-gray-500">Quick info</p></div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs text-gray-500">Opening Time</p><p className="font-semibold">{restaurant.openingTime || "Not set"}</p></div>
                <div><p className="text-xs text-gray-500">Closing Time</p><p className="font-semibold">{restaurant.closingTime || "Not set"}</p></div>
                <div><p className="text-xs text-gray-500">Delivery Time</p><p className="font-semibold">{restaurant.deliveryTime ? `${restaurant.deliveryTime} mins` : "Not set"}</p></div>
                <div><p className="text-xs text-gray-500">Min Order</p><p className="font-semibold">{restaurant.minOrderValue ? '\u20B9' + restaurant.minOrderValue : "Not set"}</p></div>
              </div>
              <div className="pt-4 border-t border-gray-100">
                <Link href="/owner/register-restaurant" className="w-full bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-orange-700 transition text-sm text-center block">Edit Details</Link>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-50 rounded-lg"><IndianRupee size={20} className="text-amber-600" /></div>
                <div><h3 className="text-lg font-bold text-gray-900">Monthly Revenue</h3><p className="text-sm text-gray-500">Revenue trend</p></div>
              </div>
              <Link href="/owner/analytics" className="text-orange-600 text-sm flex items-center gap-1">Full analytics <ChevronRight size={16} /></Link>
            </div>
            <div className="p-6">
              {analytics?.monthlyOrders && analytics.monthlyOrders.length > 0 ? (
                <div className="space-y-3">
                  {analytics.monthlyOrders.slice(-6).reverse().map((m: { _id: { month: number; year: number }; revenue: number; count: number }, idx: number) => {
                    const mn = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                    const max = Math.max(...(analytics.monthlyOrders || []).map((x: { revenue: number }) => x.revenue));
                    const pct = max > 0 ? (m.revenue / max) * 100 : 0;
                    return (
                      <div key={idx} className="flex items-center gap-3">
                        <span className="text-sm text-gray-500 w-12">{mn[m._id.month - 1]} {m._id.year}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                          <div className="bg-gradient-to-r from-orange-500 to-red-500 h-full rounded-full flex items-center justify-end pr-2" style={{ width: `${Math.max(pct, 10)}%` }}>
                            <span className="text-xs text-white font-medium">\u20B9{(m.revenue / 1000).toFixed(1)}k</span>
                          </div>
                        </div>
                        <span className="text-sm font-medium text-gray-600 w-8 text-right">{m.count}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8"><TrendingUp size={32} className="mx-auto text-gray-300 mb-2" /><p className="text-gray-500">No revenue data yet</p></div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
