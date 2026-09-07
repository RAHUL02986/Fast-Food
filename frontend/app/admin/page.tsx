"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { restaurantAPI, analyticsAPI, adminAPI, orderAPI } from "@/lib/api";
import type { Restaurant, Order, User } from "@/types";

interface DashboardStats {
  totalOrders: number;
  totalBookings: number;
  totalRestaurants: number;
  totalUsers: number;
  totalRevenue: number;
}

interface MonthlyOrder {
  _id: { month: number; year: number };
  count: number;
  revenue: number;
}

interface DashboardData {
  stats: DashboardStats;
  monthlyOrders: MonthlyOrder[];
}

interface AdminBookingView {
  _id: string;
  restaurant?: { name?: string; city?: string } | string;
  status?: string;
  user?: User | string;
  customer?: User | string;
  partySize?: number;
  guests?: number;
  date?: string;
  slot?: {
    _id?: string;
    startTime?: string;
    endTime?: string;
    date?: string;
  } | string;
  advanceAmount?: number;
  price?: number;
  createdAt?: string;
}
import { AdminNav } from "@/components/Navs";
import Link from "next/link";
import { Users, ShoppingBag, Calendar, Store, IndianRupee, TrendingUp, Clock, CheckCircle, UserPlus, ChevronRight, Package, Utensils, AlertCircle } from "lucide-react";

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [pendingRestaurants, setPendingRestaurants] = useState<Restaurant[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [recentBookings, setRecentBookings] = useState<AdminBookingView[]>([]);
  const [inviteCode, setInviteCode] = useState("");
  const [inviteExpiresAt, setInviteExpiresAt] = useState("");
  const [loading, setLoading] = useState(true);
  const [inviteLoading, setInviteLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) router.push("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dd, rd, od, bd] = await Promise.all([
          analyticsAPI.getAdminDashboard(),
          restaurantAPI.getPendingRestaurants(),
          orderAPI.getOrders({ limit: 5 }),
          adminAPI.getBookings({ limit: 5 })
        ]);
        setDashboard(dd.data as DashboardData);
        setPendingRestaurants((rd.data as Restaurant[] | undefined)?.slice(0, 5) || []);
        setRecentOrders((od.data as Order[] | undefined)?.slice(0, 5) || []);
        setRecentBookings((bd.data as AdminBookingView[] | undefined)?.slice(0, 5) || []);
      } catch (e: unknown) { console.error(e); } finally { setLoading(false); }
    };
    if (!authLoading) fetchData();
  }, [authLoading]);

  const handleGenerateInvite = async () => {
    try { setInviteLoading(true); const r = await adminAPI.generateInvite(); setInviteCode(r.data.code); setInviteExpiresAt(r.data.expiresAt); }
    catch (e: unknown) { alert((e as Error)?.message || "Unable to generate invite code"); } finally { setInviteLoading(false); }
  };
  const handleCopyInvite = async () => {
    if (!inviteCode) return;
    try { await navigator.clipboard.writeText(inviteCode); alert("Copied"); } catch { alert("Copy failed"); }
  };
  const handleApprove = async (id: string) => {
    try { await restaurantAPI.approveRestaurant(id); setPendingRestaurants(p => p.filter(r => r._id !== id)); alert("Approved"); } catch { alert("Error"); }
  };
  const handleReject = async (id: string) => {
    const reason = prompt("Rejection reason:");
    if (reason) { try { await restaurantAPI.rejectRestaurant(id, { reason }); setPendingRestaurants(p => p.filter(r => r._id !== id)); } catch { alert("Error"); } }
  };
  const fmt = (n: number) => "\u20B9" + (n || 0).toLocaleString("en-IN");
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const statusClr = (s: string) => {
    switch(s) {
      case "delivered": case "served": case "completed": return "bg-green-100 text-green-800";
      case "cancelled": case "rejected": return "bg-red-100 text-red-800";
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
  const stats = [
    { label: "Total Revenue", value: fmt(dashboard?.stats?.totalRevenue ?? 0), I: IndianRupee, color: "#16a34a", bg: "bg-green-50", ch: "+12.5%" },
    { label: "Total Orders", value: dashboard?.stats?.totalOrders || 0, I: ShoppingBag, color: "#2563eb", bg: "bg-blue-50", ch: "+8.2%" },
    { label: "Total Bookings", value: dashboard?.stats?.totalBookings || 0, I: Calendar, color: "#9333ea", bg: "bg-purple-50", ch: "+5.1%" },
    { label: "Restaurants", value: dashboard?.stats?.totalRestaurants || 0, I: Store, color: "#ea580c", bg: "bg-orange-50", ch: "+3" },
    { label: "Registered Users", value: dashboard?.stats?.totalUsers || 0, I: Users, color: "#0891b2", bg: "bg-cyan-50", ch: "+15.3%" },
    { label: "Pending Approvals", value: pendingRestaurants.length, I: Clock, color: "#ca8a04", bg: "bg-amber-50", ch: "" },
  ];
  const actions = [
    { l: "Restaurants", h: "/admin/restaurants", i: Utensils, c: "bg-orange-600" },
    { l: "Orders", h: "/admin/orders", i: Package, c: "bg-blue-600" },
    { l: "Analytics", h: "/admin/analytics", i: TrendingUp, c: "bg-green-600" },
    { l: "Customers", h: "/admin/customers", i: Users, c: "bg-purple-600" },
    { l: "Delivery", h: "/admin/delivery", i: ShoppingBag, c: "bg-cyan-600" },
    { l: "Bookings", h: "/admin/bookings", i: Calendar, c: "bg-pink-600" },
  ];
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-orange-50">
      <AdminNav />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user?.name?.split(" ")[0]}!</h1>
          <p className="text-gray-500 mt-1">Platform overview at a glance.</p>
        </div>
        <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-6 mb-8 text-white shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div><h2 className="text-xl font-bold mb-1">Owner Invitation</h2><p className="text-orange-100 text-sm">Generate invite code for new restaurant owners</p></div>
            <button onClick={handleGenerateInvite} disabled={inviteLoading} className="bg-white text-orange-600 px-6 py-3 rounded-xl font-bold hover:bg-orange-50 transition disabled:opacity-60 flex items-center gap-2"><UserPlus size={18} />{inviteLoading ? "Generating..." : "Generate Invite Code"}</button>
          </div>
          {inviteCode && (
            <div className="mt-4 bg-white/10 backdrop-blur rounded-xl p-4">
              <p className="text-sm text-orange-100 mb-2">Share this code:</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="bg-white text-gray-900 font-bold text-xl tracking-[0.2em] px-4 py-3 rounded-lg flex-1 text-center font-mono">{inviteCode}</div>
                <button onClick={handleCopyInvite} className="bg-black/10 border border-white/20 text-white px-4 py-3 rounded-lg">Copy</button>
              </div>
              <p className="text-xs text-orange-100 mt-2">Valid until {new Date(inviteExpiresAt).toLocaleString("en-IN")}</p>
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
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
            {actions.map((a, i) => (
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
                <div className="p-2 bg-amber-50 rounded-lg"><AlertCircle size={20} className="text-amber-600" /></div>
                <div><h3 className="text-lg font-bold text-gray-900">Pending Approvals</h3><p className="text-sm text-gray-500">{pendingRestaurants.length} waiting</p></div>
              </div>
              <Link href="/admin/restaurants" className="text-orange-600 text-sm flex items-center gap-1">View all <ChevronRight size={16} /></Link>
            </div>
            <div className="divide-y divide-gray-50">
              {pendingRestaurants.length === 0 ? (
                <div className="p-8 text-center"><CheckCircle size={32} className="mx-auto text-green-400 mb-2" /><p className="text-gray-500">All caught up!</p></div>
              ) : pendingRestaurants.map((r) => (
                <div key={r._id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{r.name}</p>
                      <p className="text-sm text-gray-500 truncate">{r.cuisine?.join(", ")} | {r.location}</p>
                      <p className="text-xs text-gray-400 mt-1">Owner: {typeof r.owner === "object" ? r.owner?.name : r.owner} | {fmtDate(r.createdAt ?? "")}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => handleApprove(r._id)} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-green-700">Approve</button>
                      <button onClick={() => handleReject(r._id)} className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-700">Reject</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg"><Package size={20} className="text-blue-600" /></div>
                <div><h3 className="text-lg font-bold text-gray-900">Recent Orders</h3><p className="text-sm text-gray-500">Latest orders</p></div>
              </div>
              <Link href="/admin/orders" className="text-orange-600 text-sm flex items-center gap-1">View all <ChevronRight size={16} /></Link>
            </div>
            <div className="divide-y divide-gray-50">
              {recentOrders.length === 0 ? (
                <div className="p-8 text-center"><ShoppingBag size={32} className="mx-auto text-gray-300 mb-2" /><p className="text-gray-500">No orders yet</p></div>
              ) : recentOrders.map((o) => (
                <div key={o._id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-orange-600">{o.orderNumber}</p>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusClr(o.status)}`}>{o.status?.replace(/_/g, " ")}</span>
                      </div>
                      <p className="text-sm text-gray-600 truncate">{o.restaurant?.name} | {o.items?.length || 0} items</p>
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
                <div className="p-2 bg-purple-50 rounded-lg"><Calendar size={20} className="text-purple-600" /></div>
                <div><h3 className="text-lg font-bold text-gray-900">Recent Bookings</h3><p className="text-sm text-gray-500">Latest reservations</p></div>
              </div>
              <Link href="/admin/bookings" className="text-orange-600 text-sm flex items-center gap-1">View all <ChevronRight size={16} /></Link>
            </div>
            <div className="divide-y divide-gray-50">
              {recentBookings.length === 0 ? (
                <div className="p-8 text-center"><Calendar size={32} className="mx-auto text-gray-300 mb-2" /><p className="text-gray-500">No bookings yet</p></div>
              ) : recentBookings.map((b) => (
                <div key={b._id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{typeof b.restaurant === "object" ? b.restaurant?.name || "Restaurant" : b.restaurant || "Restaurant"}</p>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusClr(b.status ?? "")}`}>{b.status}</span>
                      </div>
                      <p className="text-sm text-gray-600 truncate">{typeof b.user === "object" ? b.user?.name : b.user} | {b.guests} guests</p>
                      <p className="text-xs text-gray-400 mt-1">{new Date(b.date ?? "").toLocaleDateString("en-IN", { day: "numeric", month: "short" })} at {typeof b.slot === "object" ? `${b.slot.startTime ?? ""} - ${b.slot.endTime ?? ""}` : b.slot}</p>
                    </div>
                    <div className="text-right shrink-0"><p className="font-bold">\u20B9{b.price?.toLocaleString()}</p></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded-lg"><TrendingUp size={20} className="text-green-600" /></div>
                <div><h3 className="text-lg font-bold text-gray-900">Monthly Revenue</h3><p className="text-sm text-gray-500">Revenue trend</p></div>
              </div>
              <Link href="/admin/analytics" className="text-orange-600 text-sm flex items-center gap-1">Full analytics <ChevronRight size={16} /></Link>
            </div>
            <div className="p-6">
              {dashboard?.monthlyOrders && dashboard.monthlyOrders.length > 0 ? (
                <div className="space-y-3">
                  {dashboard.monthlyOrders.slice(-6).reverse().map((m: MonthlyOrder, idx: number) => {
                    const mn = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
                    const max = Math.max(...dashboard.monthlyOrders.map((x: MonthlyOrder) => x.revenue));
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
