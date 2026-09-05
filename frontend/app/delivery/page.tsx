"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { deliveryAPI } from "@/lib/api";
import { CustomerNav } from "@/components/Navs";
import Link from "next/link";
import {
  Bike, CheckCircle2, Clock, IndianRupee, MapPin, Navigation, Package,
  Phone, RefreshCw, Store, ToggleLeft, ToggleRight, Wallet, XCircle,
} from "lucide-react";

/* ---------- status badge styles ---------- */
const ORDER_STATUS_STYLES: Record<string, string> = {
  placed: "bg-blue-100 text-blue-800",
  confirmed: "bg-blue-100 text-blue-800",
  preparing: "bg-yellow-100 text-yellow-800",
  ready: "bg-purple-100 text-purple-800",
  out_for_delivery: "bg-orange-100 text-orange-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const DELIVERY_STATUS_STYLES: Record<string, string> = {
  assigned: "bg-amber-100 text-amber-800",
  accepted: "bg-blue-100 text-blue-800",
  rejected: "bg-red-100 text-red-800",
  reached_restaurant: "bg-indigo-100 text-indigo-800",
  picked_up: "bg-purple-100 text-purple-800",
  out_for_delivery: "bg-orange-100 text-orange-800",
  delivered: "bg-green-100 text-green-800",
};

const DELIVERY_STATUS_LABELS: Record<string, string> = {
  assigned: "Awaiting your response",
  accepted: "Accepted — head to restaurant",
  reached_restaurant: "At restaurant — pickup ready",
  picked_up: "Picked up — start delivery",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
};

const fmt = (n?: number | null) =>
  `₹${(typeof n === "number" ? n : 0).toLocaleString("en-IN")}`;

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";

const addrLine = (address: any) =>
  !address
    ? "—"
    : [address.street, address.city, address.state, address.zip].filter(Boolean).join(", ");

/* ---------- delivery request / active order card ---------- */
function DeliveryDetailCard({ order, children }: { order: any; children?: React.ReactNode }) {
  const delivery = order.delivery || {};
  const items = order.items || [];
  return (
    <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
      <div className="flex justify-between items-start gap-2 p-5 pb-3">
        <div>
          <p className="font-bold text-orange-600">#{order.orderNumber}</p>
          <p className="text-sm text-gray-700 mt-0.5 flex items-center gap-1">
            <Store size={13} /> {order.restaurant?.name || "Restaurant"} · {order.restaurant?.city || ""}
          </p>
          <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
            <MapPin size={13} /> Pickup: {order.restaurant?.location || order.restaurant?.city || "—"}
          </p>
          <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
            🏠 Delivery: {addrLine(order.deliveryAddress)}
          </p>
        </div>
        <div className="text-right shrink-0">
          <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${DELIVERY_STATUS_STYLES[delivery.status] || "bg-gray-100 text-gray-700"}`}>
            {DELIVERY_STATUS_LABELS[delivery.status] || delivery.status?.replace(/_/g, " ") || "—"}
          </span>
          <p className="text-xs text-gray-400 mt-2">Assigned {fmtDate(delivery.assignedAt)}</p>
        </div>
      </div>

      <div className="px-5 pb-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <p className="text-gray-600">
          👤 {order.customer?.name || "Customer"}{" "}
          {order.customer?.phone && (
            <a href={`tel:${order.customer.phone}`} className="text-orange-600 inline-flex items-center gap-1 hover:underline">
              <Phone size={12} /> {order.customer.phone}
            </a>
          )}
        </p>
        <p className="text-gray-600">📦 {items.length} item{items.length === 1 ? "" : "s"}</p>
        <p className="text-gray-600">💰 Delivery Fee: <strong>{fmt(delivery.fee ?? order.deliveryCharge)}</strong></p>
        <p className="text-gray-600">🤑 Your Earning: <strong className="text-green-700">{fmt(delivery.partnerEarning)}</strong></p>
      </div>

      <div className="px-5 pb-3 flex flex-wrap gap-2">
        {items.slice(0, 5).map((item: any, i: number) => (
          <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
            {(typeof item.menuItem === "object" && item.menuItem?.name) || "Item"} × {item.quantity}
          </span>
        ))}
      </div>

      {order.specialInstructions && (
        <p className="mx-5 mb-3 text-xs bg-amber-50 border border-amber-100 text-amber-800 rounded px-3 py-2">
          📝 Instructions: {order.specialInstructions}
        </p>
      )}

      {children && <div className="px-5 pb-5 flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

/* ---------- stat card ---------- */
function StatCard({ label, value, icon, accent = "text-gray-800" }: { label: string; value: any; icon: React.ReactNode; accent?: string }) {
  return (
    <div className="bg-white rounded-lg shadow p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <p className="text-gray-600 text-xs sm:text-sm font-semibold">{label}</p>
        <span className="text-gray-300">{icon}</span>
      </div>
      <p className={`text-2xl sm:text-3xl font-bold mt-1 ${accent}`}>{value}</p>
    </div>
  );
}

export default function DeliveryPartnerDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [me, setMe] = useState<any>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [active, setActive] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [wallet, setWallet] = useState<any>(null);
  const [earnings, setEarnings] = useState<any[]>([]);
  const [tab, setTab] = useState<"deliveries" | "earnings" | "history">("deliveries");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string>(""); // id of order being acted on
  const locationTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Only real delivery partners reach this dashboard
  useEffect(() => {
    if (!authLoading && (!user || (user.role !== "delivery_partner" && !user.isDeliveryPartner))) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    setError("");
    try {
      const [profileData, reqData, activeData, walletData] = await Promise.all([
        deliveryAPI.getMyProfile().catch(() => null),
        deliveryAPI.getRequests().catch(() => ({ data: [] })),
        deliveryAPI.getActiveDeliveries().catch(() => ({ data: [] })),
        deliveryAPI.getWallet().catch(() => null),
      ]);
      if (profileData) {
        setMe(profileData.data);
        setWallet(profileData.data.wallet);
      }
      setRequests(reqData.data || []);
      setActive(activeData.data || []);
      if (walletData) setWallet(walletData.data);
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard");
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  const fetchEarningsTab = useCallback(async () => {
    try {
      const [historyData, earningsData] = await Promise.all([
        deliveryAPI.getHistory({ limit: 30 }),
        deliveryAPI.getMyEarnings({ limit: 30 }),
      ]);
      setHistory(historyData.data || []);
      setEarnings(earningsData.data?.earnings || []);
    } catch {
      /* transient */
    }
  }, []);

  useEffect(() => {
    if (user) fetchAll();
  }, [user, fetchAll]);

  // Real-time-ish updates: poll every 10s while on the deliveries tab
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => fetchAll(true), 10000);
    return () => clearInterval(interval);
  }, [user, fetchAll]);

  // Load earnings/history lazily
  useEffect(() => {
    if (user && (tab === "earnings" || tab === "history")) fetchEarningsTab();
  }, [user, tab, fetchEarningsTab]);

  const profile = me?.profile;
  const profileUser = typeof profile?.user === "object" ? profile?.user : user;
  const partnerStatus = profile?.status || "pending";
  const online = ["active", "busy"].includes(partnerStatus);
  const todayEarnings = earnings
    .filter(
      (e: any) =>
        e.partnerEarning &&
        e.completedAt &&
        new Date(e.completedAt).toDateString() === new Date().toDateString()
    )
    .reduce((sum: number, e: any) => sum + (e.partnerEarning || 0), 0);

  // ---------- actions ----------
  const runAction = async (orderId: string, action: () => Promise<any>, successMsg: string) => {
    setBusy(orderId);
    setError("");
    try {
      const res = await action();
      if (successMsg) alert(res?.message || successMsg);
      await fetchAll(true);
      if (tab === "earnings" || tab === "history") await fetchEarningsTab();
    } catch (err: any) {
      setError(err.message || "Action failed");
    } finally {
      setBusy("");
    }
  };

  const acceptRequest = (id: string) =>
    runAction(id, () => deliveryAPI.acceptRequest(id), "Delivery accepted");

  const rejectRequest = (id: string) => {
    const reason = prompt("Why are you rejecting this delivery? (optional)") || undefined;
    runAction(id, () => deliveryAPI.rejectRequest(id, reason ? { reason } : {}), "Delivery rejected");
  };

  const toggleAvailability = async () => {
    setError("");
    try {
      const res = await deliveryAPI.setAvailability(!online);
      alert(res.message);
      await fetchAll(true);
    } catch (err: any) {
      setError(err.message || "Could not change availability");
    }
  };

  // ---------- live location sharing (with partner consent) ----------
  const pushLocation = useCallback(async () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await deliveryAPI.updateLocation(pos.coords.latitude, pos.coords.longitude);
        } catch {
          /* transient */
        }
      },
      () => {
        /* permission denied — tracking is opt-in, stay silent */
      },
      { enableHighAccuracy: true, maximumAge: 15000 }
    );
  }, []);

  useEffect(() => {
    // Track only while actively delivering (picked up / out for delivery)
    const tracking = active.some((o) => ["picked_up", "out_for_delivery"].includes(o.delivery?.status));
    if (tracking && navigator.geolocation) {
      pushLocation(); // immediate push
      locationTimer.current = setInterval(pushLocation, 30000); // every 30s
    }
    return () => {
      if (locationTimer.current) {
        clearInterval(locationTimer.current);
        locationTimer.current = null;
      }
    };
  }, [active, pushLocation]);

  const shareLocationNow = (orderId: string) =>
    runAction(orderId, async () => {
      await new Promise<void>((resolve) => {
        if (!navigator.geolocation) return resolve();
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            try {
              await deliveryAPI.updateLocation(pos.coords.latitude, pos.coords.longitude);
            } catch {
              /* ignore */
            }
            resolve();
          },
          () => resolve(),
          { enableHighAccuracy: true, maximumAge: 15000 }
        );
      });
      return { message: "Location shared" };
    }, "");

  // ---------- loading / auth gates ----------
  if (authLoading || (authLoading === false && !user)) {
    return <div className="p-8 text-center">Loading…</div>;
  }

  if (!authLoading && user && !me && loading === false) {
    // No partner profile (legacy flag user) — ask to contact admin
    return (
      <div className="min-h-screen bg-gray-50">
        <CustomerNav />
        <div className="max-w-2xl mx-auto p-8 text-center">
          <h1 className="text-2xl font-bold mb-3">Delivery Partner Dashboard</h1>
          <p className="text-gray-600">
            Your delivery partner profile could not be loaded. If you just registered, please wait a
            moment and refresh. Otherwise contact support.
          </p>
        </div>
      </div>
    );
  }

  if (loading || !profile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <CustomerNav />
        <div className="p-8 text-center">Loading dashboard…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CustomerNav />

      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            {profileUser?.avatar ? (
              <img src={profileUser.avatar} alt="" className="h-14 w-14 rounded-full object-cover border-2 border-orange-200" />
            ) : (
              <span className="h-14 w-14 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xl font-bold">
                {profileUser?.name?.charAt(0)?.toUpperCase() || "D"}
              </span>
            )}
            <div>
              <h1 className="text-2xl font-bold">Hi, {profileUser?.name?.split(" ")[0] || "Partner"} 👋</h1>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  partnerStatus === "active" ? "bg-green-100 text-green-800"
                  : partnerStatus === "busy" ? "bg-orange-100 text-orange-800"
                  : partnerStatus === "approved" ? "bg-blue-100 text-blue-800"
                  : partnerStatus === "offline" ? "bg-gray-100 text-gray-700"
                  : partnerStatus === "suspended" ? "bg-red-100 text-red-800"
                  : "bg-amber-100 text-amber-800"
                }`}>
                  {partnerStatus.toUpperCase()}
                </span>
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Bike size={12} /> {profile.vehicleType?.toUpperCase() || "—"} {profile.vehicleNumber ? `· ${profile.vehicleNumber}` : ""}
                </span>
              </div>
            </div>
          </div>

          {/* availability toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleAvailability}
              disabled={["pending", "rejected", "suspended"].includes(partnerStatus)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${
                online ? "bg-green-600 hover:bg-green-700 text-white" : "bg-white border-2 border-gray-300 text-gray-600 hover:border-green-500"
              }`}
            >
              {online ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
              {online ? "Available for Delivery" : "Offline"}
            </button>
            <button
              onClick={() => fetchAll()}
              className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-3 rounded-xl hover:border-orange-400 transition"
            >
              <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
        </div>

        {/* status banners */}
        {partnerStatus === "pending" && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg mb-6 text-sm">
            ⏳ Your account is <strong>pending admin approval</strong>. You cannot accept deliveries yet — you will
            receive a notification once approved.
          </div>
        )}
        {partnerStatus === "rejected" && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
            ❌ Your application was rejected. Reason: {profile.rejectionReason || "—"}
          </div>
        )}
        {partnerStatus === "suspended" && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
            🚫 Your account has been suspended. Reason: {profile.suspendedReason || "Contact the admin"}
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">{error}</div>
        )}

        {/* overview stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 mb-8">
          <StatCard label="Active Deliveries" value={active.length} icon={<Package size={18} />} accent="text-orange-600" />
          <StatCard label="Pending Requests" value={requests.length} icon={<Clock size={18} />} accent="text-amber-600" />
          <StatCard label="Completed" value={me?.completedDeliveries ?? profile.completedDeliveries ?? 0} icon={<CheckCircle2 size={18} />} accent="text-green-600" />
          <StatCard label="Today's Earnings" value={fmt(todayEarnings)} icon={<IndianRupee size={18} />} accent="text-blue-600" />
          <StatCard label="Total Earnings" value={fmt(wallet?.totalEarnings ?? 0)} icon={<Wallet size={18} />} accent="text-purple-600" />
          <StatCard label="Available Balance" value={fmt(wallet?.availableBalance ?? 0)} icon={<Wallet size={18} />} accent="text-gray-800" />
        </div>

        {/* tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {([
            ["deliveries", "Deliveries"],
            ["earnings", "Earnings & Wallet"],
            ["history", "History"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                tab === key ? "bg-orange-600 text-white" : "bg-white border border-gray-200 text-gray-700 hover:border-orange-400"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "deliveries" && (
          <div className="grid lg:grid-cols-2 gap-6 lg:gap-8 items-start">
            {/* pending requests */}
            <section>
              <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                <Clock size={17} className="text-amber-600" /> Pending Delivery Requests
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{requests.length}</span>
              </h2>
              {requests.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500 text-sm">
                  No pending delivery requests. New assignments appear here with a notification.
                </div>
              ) : (
                <div className="space-y-4">
                  {requests.map((order) => (
                    <DeliveryDetailCard key={order._id} order={order}>
                      <button
                        onClick={() => acceptRequest(order._id)}
                        disabled={busy === order._id}
                        className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white py-2.5 rounded-lg font-semibold transition"
                      >
                        <CheckCircle2 size={15} /> Accept Delivery
                      </button>
                      <button
                        onClick={() => rejectRequest(order._id)}
                        disabled={busy === order._id}
                        className="flex-1 flex items-center justify-center gap-2 bg-white border-2 border-red-200 text-red-600 hover:bg-red-50 py-2.5 rounded-lg font-semibold transition"
                      >
                        <XCircle size={15} /> Reject
                      </button>
                    </DeliveryDetailCard>
                  ))}
                </div>
              )}
            </section>

            {/* active deliveries */}
            <section>
              <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                <Navigation size={17} className="text-orange-600" /> Active Deliveries
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{active.length}</span>
              </h2>
              {active.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500 text-sm">
                  No active deliveries yet. Accepted orders show here with live location sharing.
                </div>
              ) : (
                <div className="space-y-4">
                  {active.map((order) => {
                    const d = order.delivery || {};
                    const actionBtn =
                      d.status === "accepted" ? (
                        <button
                          key="start-pickup"
                          onClick={() => runAction(order._id, () => deliveryAPI.markReached(order._id), "Pickup started")}
                          disabled={busy === order._id}
                          className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white py-2.5 rounded-lg font-semibold transition"
                        >
                          <MapPin size={15} /> Start Pickup
                        </button>
                      ) : d.status === "reached_restaurant" ? (
                        <button
                          key="picked-up"
                          onClick={() => runAction(order._id, () => deliveryAPI.markPickedUp(order._id), "Order picked up")}
                          disabled={busy === order._id}
                          className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white py-2.5 rounded-lg font-semibold transition"
                        >
                          <Package size={15} /> Mark Order Picked Up
                        </button>
                      ) : d.status === "picked_up" ? (
                        <button
                          key="start-delivery"
                          onClick={() => runAction(order._id, () => deliveryAPI.startDelivery(order._id), "Delivery started")}
                          disabled={busy === order._id}
                          className="flex-1 flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 text-white py-2.5 rounded-lg font-semibold transition"
                        >
                          <Navigation size={15} /> Start Delivery
                        </button>
                      ) : d.status === "out_for_delivery" ? (
                        <button
                          key="delivered"
                          onClick={() => runAction(order._id, () => deliveryAPI.markDelivered(order._id), "Order delivered")}
                          disabled={busy === order._id}
                          className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white py-2.5 rounded-lg font-semibold transition"
                        >
                          <CheckCircle2 size={15} /> Mark Order Delivered
                        </button>
                      ) : null;

                    return (
                      <DeliveryDetailCard key={order._id} order={order}>
                        {actionBtn}
                        <button
                          onClick={() => shareLocationNow(order._id)}
                          className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-semibold transition"
                        >
                          <Navigation size={15} /> Share Location
                        </button>
                        <Link
                          href={`/orders/${order._id}`}
                          className="flex-1 flex items-center justify-center bg-white border border-gray-200 text-gray-700 hover:border-orange-400 py-2.5 rounded-lg font-semibold transition"
                        >
                          Order Details
                        </Link>
                      </DeliveryDetailCard>
                    );
                  })}
                  <p className="text-xs text-gray-400 px-1">
                    📍 Live location is shared automatically while your order is picked up / out for delivery
                    (browser permission required). Tracking stops when the order is delivered or you go offline.
                  </p>
                </div>
              )}
            </section>
          </div>
        )}

        {tab === "earnings" && (
          <div className="space-y-6">
            {/* wallet */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Available Balance" value={fmt(wallet?.availableBalance ?? 0)} icon={<Wallet size={18} />} />
              <StatCard label="Pending Earnings" value={fmt(wallet?.pendingEarnings ?? 0)} icon={<Clock size={18} />} accent="text-amber-600" />
              <StatCard label="Paid Earnings" value={fmt(wallet?.paidEarnings ?? 0)} icon={<CheckCircle2 size={18} />} accent="text-green-600" />
              <StatCard label="Completed Deliveries" value={wallet?.completedDeliveries ?? 0} icon={<Package size={18} />} accent="text-purple-600" />
            </div>

            {/* earnings table */}
            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <div className="p-5 border-b">
                <h3 className="text-lg font-bold">Earnings Records</h3>
                <p className="text-xs text-gray-500 mt-1">One record is created automatically for every completed delivery.</p>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-left">
                    <th className="px-4 py-3 font-semibold">Order</th>
                    <th className="px-4 py-3 font-semibold">Delivery Charge</th>
                    <th className="px-4 py-3 font-semibold">Your Earning</th>
                    <th className="px-4 py-3 font-semibold">Platform</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {earnings.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No earnings yet — complete deliveries to start earning.</td></tr>
                  ) : (
                    earnings.map((e: any) => (
                      <tr key={e._id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 font-semibold text-orange-600">{e.orderNumber || "—"}</td>
                        <td className="px-4 py-3">{fmt(e.totalDeliveryCharge)}</td>
                        <td className="px-4 py-3 font-semibold text-green-700">{fmt(e.partnerEarning)}</td>
                        <td className="px-4 py-3 text-gray-500">{fmt(e.adminEarning)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${e.status === "paid" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                            {e.status === "paid" ? "Paid" : "Pending"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{fmtDate(e.completedAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* payout history */}
            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <div className="p-5 border-b"><h3 className="text-lg font-bold">Payout History</h3></div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-left">
                    <th className="px-4 py-3 font-semibold">Amount</th>
                    <th className="px-4 py-3 font-semibold">Deliveries</th>
                    <th className="px-4 py-3 font-semibold">Method</th>
                    <th className="px-4 py-3 font-semibold">Reference</th>
                    <th className="px-4 py-3 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {(wallet?.payouts || []).length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No payouts yet.</td></tr>
                  ) : (
                    (wallet?.payouts || []).map((p: any) => (
                      <tr key={p._id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 font-semibold">{fmt(p.amount)}</td>
                        <td className="px-4 py-3">{p.deliveryCount}</td>
                        <td className="px-4 py-3 capitalize">{p.method}</td>
                        <td className="px-4 py-3 text-gray-500">{p.reference || "—"}</td>
                        <td className="px-4 py-3 text-gray-500">{fmtDate(p.processedAt || p.createdAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "history" && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <CheckCircle2 size={17} className="text-green-600" /> Delivery History
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{history.length}</span>
            </h2>
            {history.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500 text-sm">
                No completed deliveries yet.
              </div>
            ) : (
              history.map((order) => (
                <div key={order._id} className="bg-white rounded-lg shadow border border-gray-100 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1">
                    <p className="font-bold text-orange-600">#{order.orderNumber}</p>
                    <p className="text-sm text-gray-600">{order.restaurant?.name} → {addrLine(order.deliveryAddress)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Delivered {fmtDate(order.delivery?.deliveredAt || order.actualDeliveryTime)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-semibold">{fmt(order.delivery?.fee ?? order.deliveryCharge)}</p>
                      <p className="text-xs text-green-700">earned {fmt(order.delivery?.partnerEarning)}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${ORDER_STATUS_STYLES[order.status]}`}>
                      {order.status.replace(/_/g, " ")}
                    </span>
                    <Link href={`/orders/${order._id}`} className="text-sm text-orange-600 hover:underline whitespace-nowrap">
                      View →
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}







