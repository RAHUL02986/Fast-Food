"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { deliveryAPI } from "@/lib/api";
import { AdminNav } from "@/components/Navs";
import { Bike, MapPin, Clock, User } from "lucide-react";
import type { Order } from "@/types";
import { fmt, fmtDate, DELIVERY_STATUS_STYLES, DELIVERY_STATUS_LABELS, addressLine } from "@/lib/deliveryUI";

export default function AdminActiveDeliveries() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) router.push("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!authLoading && user?.role === "admin") {
      deliveryAPI.getAdminActiveDeliveries().then((res) => setOrders(res.data || [])).catch(console.error).finally(() => setLoading(false));
    }
  }, [authLoading, user]);

  if (authLoading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <div className="max-w-7xl mx-auto p-4 sm:p-8">
        <h1 className="text-2xl font-bold mb-6">Active Deliveries</h1>
        {loading ? <div className="text-center py-8 text-gray-500">Loading…</div> : orders.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">No active deliveries.</div>
        ) : (
          <div className="grid gap-4">
            {orders.map((o) => {
              const d = o.delivery || {};
              const partner = typeof d.assignedBy === "object" ? d.assignedBy : null;
              return (
                <div key={o._id} className="bg-white rounded-lg shadow p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">Order #{o._id?.slice(-6)}</p>
                      <p className="text-sm text-gray-500 flex items-center gap-1 mt-1"><User size={13} /> {typeof o.customer === "object" ? (o.customer as any)?.name : "—"}</p>
                      <p className="text-sm text-gray-500 flex items-center gap-1 mt-1"><Bike size={13} /> {partner?.name || "—"}</p>
                      <p className="text-sm text-gray-500 flex items-center gap-1 mt-1"><MapPin size={13} /> {addressLine(o.deliveryAddress)}</p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${DELIVERY_STATUS_STYLES[d.status || "unassigned"]}`}>{DELIVERY_STATUS_LABELS[d.status || "unassigned"]}</span>
                      <p className="text-sm text-gray-500 mt-2">Fee: {fmt(d.fee)}</p>
                      <p className="text-xs text-gray-400 mt-1">Assigned: {fmtDate(d.assignedAt)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
