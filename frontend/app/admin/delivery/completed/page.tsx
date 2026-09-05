"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { deliveryAPI } from "@/lib/api";
import { AdminNav } from "@/components/Navs";
import { CheckCircle2, User, Bike } from "lucide-react";
import type { Order } from "@/types";
import { fmt, fmtDate } from "@/lib/deliveryUI";

export default function AdminCompletedDeliveries() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) router.push("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!authLoading && user?.role === "admin") {
      deliveryAPI.getCompletedDeliveries().then((res) => setOrders(res.data || [])).catch(console.error).finally(() => setLoading(false));
    }
  }, [authLoading, user]);

  if (authLoading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <div className="max-w-7xl mx-auto p-4 sm:p-8">
        <h1 className="text-2xl font-bold mb-6">Completed Deliveries</h1>
        {loading ? <div className="text-center py-8 text-gray-500">Loading…</div> : orders.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">No completed deliveries yet.</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b bg-gray-50 text-left">
                <th className="px-4 py-3 text-sm font-semibold">Order</th>
                <th className="px-4 py-3 text-sm font-semibold">Customer</th>
                <th className="px-4 py-3 text-sm font-semibold">Partner</th>
                <th className="px-4 py-3 text-sm font-semibold">Fee</th>
                <th className="px-4 py-3 text-sm font-semibold">Completed</th>
              </tr></thead>
              <tbody>
                {orders.map((o) => {
                  const d = o.delivery || {};
                  const partner = typeof d.assignedBy === "object" ? d.assignedBy : null;
                  return (
                    <tr key={o._id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold">#{o._id?.slice(-6)}</td>
                      <td className="px-4 py-3 text-sm">{typeof o.customer === "object" ? (o.customer as any)?.name : "—"}</td>
                      <td className="px-4 py-3 text-sm flex items-center gap-1"><Bike size={13} className="text-gray-400" /> {partner?.name || "—"}</td>
                      <td className="px-4 py-3 text-sm font-semibold">{fmt(d.fee)}</td>
                      <td className="px-4 py-3 text-sm">{fmtDate(d.deliveredAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
