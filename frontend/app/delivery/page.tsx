"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { deliveryAPI } from "@/lib/api";
import { CustomerNav } from "@/components/Navs";
import Link from "next/link";
import { Bike, IndianRupee, Package, Clock, CheckCircle, TrendingUp, ToggleLeft, ToggleRight, Wallet, MapPin, ChevronRight, Star, Phone, User, Navigation } from "lucide-react";
import { useSearchParams } from "next/navigation";
import type { Order, User as UserType } from "@/types";

// Helper to check if customer is a populated User object
function isPopulatedUser(customer: any): customer is UserType {
  return customer && typeof customer === "object" && "name" in customer;
}

// Delivery details component with client info and action buttons
function DeliveryOrderCard({ order, onAction }: { order: Order; onAction?: () => void }) {
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState("");

  const markDelivered = async () => {
    if (!confirm("Mark this order as delivered?")) return;
    setMarking(true);
    setError("");
    try {
      await deliveryAPI.markDelivered(order._id);
      onAction?.();
    } catch (err: any) {
      setError(err.message || "Failed to mark as delivered");
    } finally {
      setMarking(false);
    }
  };

  const canDeliver = order.delivery?.status === "out_for_delivery" || order.status === "out_for_delivery";
  const customer = isPopulatedUser(order.customer) ? (order.customer as UserType) : null;

  // Build delivery address string
  const addressParts = [
    order.deliveryAddress?.street,
    order.deliveryAddress?.city,
    order.deliveryAddress?.zip ? `${order.deliveryAddress.zip}` : null
  ].filter(Boolean);
  const addressLine1 = addressParts.length > 0 ? addressParts.slice(0, 2).join(", ") : null;
  const addressLine2 = addressParts.length > 2 ? addressParts[2] : null;

  return (
    <div className="p-3 sm:p-4 hover:bg-gray-50 overflow-hidden w-full">
      {/* Header: Order number and status */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-2">
        <p className="font-semibold text-orange-600 text-sm sm:text-base break-all">#{order.orderNumber}</p>
        <span className="px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800 whitespace-nowrap">{order.delivery?.status?.replace(/_/g, " ") || order.status}</span>
      </div>

      {/* Restaurant and delivery route */}
      <p className="text-xs sm:text-sm text-gray-600 break-words mb-2">
        <span className="font-medium">{order.restaurant?.name || "Restaurant"}</span>
        <span className="mx-1">→</span>
        <span>{order.deliveryAddress?.city || "Delivery"}</span>
      </p>

      {/* Client Details Card */}
      <div className="p-2 sm:p-3 bg-gray-50 rounded-lg mb-2 overflow-hidden">
        <p className="text-xs font-semibold text-gray-700 mb-1.5">Client Details</p>
        <div className="space-y-1.5">
          {/* Customer name */}
          <div className="flex items-start gap-2 text-xs sm:text-sm">
            <User size={14} className="text-orange-500 shrink-0 mt-0.5" />
            <span className="text-gray-600 break-words break-all">{customer?.name || "N/A"}</span>
          </div>
          {/* Customer phone */}
          {customer?.phone && (
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <Phone size={14} className="text-orange-500 shrink-0" />
              <a href={`tel:${customer.phone}`} className="text-orange-600 hover:underline break-all">{customer.phone}</a>
            </div>
          )}
          {/* Delivery address */}
          {addressLine1 && (
            <div className="flex items-start gap-2">
              <Navigation size={14} className="text-orange-500 shrink-0 mt-0.5" />
              <div className="text-xs text-gray-500 break-words min-w-0 flex-1">
                <p>{addressLine1}</p>
                {addressLine2 && <p>{addressLine2}</p>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Earning and Action Button */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-bold text-green-600 text-sm sm:text-base">₹{order.delivery?.partnerEarning?.toLocaleString() || 0}</p>
        {canDeliver && (
          <button
            onClick={markDelivered}
            disabled={marking}
            className="px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center gap-1 whitespace-nowrap shrink-0"
          >
            <CheckCircle size={14} />
            <span className="hidden sm:inline">{marking ? "Marking..." : "Mark Delivered"}</span>
            <span className="sm:hidden">{marking ? "..." : "Deliver"}</span>
          </button>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-2">{new Date(order.createdAt ?? "").toLocaleString()}</p>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}

interface WalletData {
  availableBalance?: number;
  pendingEarnings?: number;
  totalEarnings?: number;
  paidEarnings?: number;
  completedDeliveries?: number;
}

export default function DeliveryDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [overview, setOverview] = useState(null);
  const [activeDeliveries, setActiveDeliveries] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAvailable, setIsAvailable] = useState(user?.isAvailable || false);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [walletData, activeData] = await Promise.all([
          deliveryAPI.getWallet(),
          deliveryAPI.getActiveDeliveries()
        ]);
        setWallet(walletData.data);
        setActiveDeliveries((activeData.data as Order[]) || []);
      } catch (e: unknown) { console.error(e); } finally { setLoading(false); }
    };
    if (!authLoading && user) fetchData();
  }, [authLoading, user]);

  const fmt = (n: number) => "\u20B9" + (n || 0).toLocaleString("en-IN");
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  const toggleAvailability = () => {
    setIsAvailable(!isAvailable);
    // TODO: Update availability on server
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
    { label: "Available Balance", value: fmt(wallet?.availableBalance ?? 0), I: IndianRupee, color: "#16a34a", bg: "bg-green-50" },
    { label: "Pending Earnings", value: fmt(wallet?.pendingEarnings ?? 0), I: Clock, color: "#ca8a04", bg: "bg-amber-50" },
    { label: "Total Earned", value: fmt(wallet?.totalEarnings ?? 0), I: TrendingUp, color: "#2563eb", bg: "bg-blue-50" },
    { label: "Completed Deliveries", value: wallet?.completedDeliveries || 0, I: CheckCircle, color: "#9333ea", bg: "bg-purple-50" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-orange-50">
      <CustomerNav />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user?.name?.split(" ")[0]}!</h1>
              <p className="text-gray-500 mt-1">Delivery partner dashboard</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-sm font-medium ${isAvailable ? "text-green-600" : "text-gray-500"}`}>{isAvailable ? "Online" : "Offline"}</span>
              <button onClick={toggleAvailability} className="focus:outline-none">
                {isAvailable ? <ToggleRight size={32} className="text-green-600" /> : <ToggleLeft size={32} className="text-gray-400" />}
              </button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((s, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">{s.label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{s.value}</p>
                </div>
                <div className={`p-3 rounded-xl ${s.bg}`}>
                  <s.I size={24} style={{ color: s.color }} />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-50 rounded-lg"><Bike size={20} className="text-orange-600" /></div>
                <div><h3 className="text-lg font-bold text-gray-900">Active Deliveries</h3><p className="text-sm text-gray-500">{activeDeliveries.length} in progress</p></div>
              </div>
              <Link href="/delivery" className="text-orange-600 text-sm flex items-center gap-1">View all <ChevronRight size={16} /></Link>
            </div>
            <div className="divide-y divide-gray-50">
              {activeDeliveries.length === 0 ? (
                <div className="p-8 text-center"><Bike size={32} className="mx-auto text-gray-300 mb-2" /><p className="text-gray-500">No active deliveries. Go online to receive orders!</p></div>
              ) : activeDeliveries.slice(0, 3).map((order) => (
                <DeliveryOrderCard key={order._id} order={order} onAction={() => window.location.reload()} />
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded-lg"><Wallet size={20} className="text-green-600" /></div>
                <div><h3 className="text-lg font-bold text-gray-900">Wallet Overview</h3><p className="text-sm text-gray-500">Your earnings summary</p></div>
              </div>
              <Link href="/delivery?tab=wallet" className="text-orange-600 text-sm flex items-center gap-1">Details <ChevronRight size={16} /></Link>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 rounded-xl p-4"><p className="text-xs text-green-600 font-medium">Available</p><p className="text-2xl font-bold text-green-700">{fmt(wallet?.availableBalance ?? 0)}</p></div>
                <div className="bg-amber-50 rounded-xl p-4"><p className="text-xs text-amber-600 font-medium">Pending</p><p className="text-2xl font-bold text-amber-700">{fmt(wallet?.pendingEarnings ?? 0)}</p></div>
              </div>
              <div className="pt-4 border-t border-gray-100 space-y-2">
                <div className="flex justify-between text-sm"><span className="text-gray-500">Total Earned</span><span className="font-semibold">{fmt(wallet?.totalEarnings ?? 0)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500">Paid Out</span><span className="font-semibold">{fmt(wallet?.paidEarnings ?? 0)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-500">Deliveries</span><span className="font-semibold">{wallet?.completedDeliveries || 0}</span></div>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg"><Package size={20} className="text-blue-600" /></div>
              <div><h3 className="text-lg font-bold text-gray-900">Quick Actions</h3><p className="text-sm text-gray-500">Common tasks</p></div>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Link href="/delivery" className="bg-orange-50 rounded-xl p-4 text-center hover:bg-orange-100 transition group"><Bike size={24} className="mx-auto text-orange-600 mb-2 group-hover:scale-110 transition-transform" /><p className="text-sm font-medium text-gray-700">My Deliveries</p></Link>
              <Link href="/delivery?tab=history" className="bg-blue-50 rounded-xl p-4 text-center hover:bg-blue-100 transition group"><CheckCircle size={24} className="mx-auto text-blue-600 mb-2 group-hover:scale-110 transition-transform" /><p className="text-sm font-medium text-gray-700">History</p></Link>
              <Link href="/delivery?tab=wallet" className="bg-green-50 rounded-xl p-4 text-center hover:bg-green-100 transition group"><Wallet size={24} className="mx-auto text-green-600 mb-2 group-hover:scale-110 transition-transform" /><p className="text-sm font-medium text-gray-700">Wallet</p></Link>
              <Link href="/delivery?tab=earnings" className="bg-purple-50 rounded-xl p-4 text-center hover:bg-purple-100 transition group"><TrendingUp size={24} className="mx-auto text-purple-600 mb-2 group-hover:scale-110 transition-transform" /><p className="text-sm font-medium text-gray-700">Earnings</p></Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


