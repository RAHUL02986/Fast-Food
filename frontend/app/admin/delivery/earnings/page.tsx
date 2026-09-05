"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { deliveryAPI } from "@/lib/api";
import { AdminNav } from "@/components/Navs";
import { DollarSign, TrendingUp, Users, Bike } from "lucide-react";
import type { DeliveryEarningRecord } from "@/types";
import { fmt, fmtDate } from "@/lib/deliveryUI";

export default function AdminDeliveryEarnings() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [earnings, setEarnings] = useState<DeliveryEarningRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ total: 0, partner: 0, admin: 0 });

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) router.push("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!authLoading && user?.role === "admin") {
      deliveryAPI.getEarnings().then((res) => {
        setEarnings(res.data?.earnings || []);
        setTotals({
          total: res.data?.totalDeliveryCharges || 0,
          partner: res.data?.totalPartnerEarnings || 0,
          admin: res.data?.totalAdminEarnings || 0,
        });
      }).catch(console.error).finally(() => setLoading(false));
    }
  }, [authLoading, user]);

  if (authLoading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <div className="max-w-7xl mx-auto p-4 sm:p-8">
        <h1 className="text-2xl font-bold mb-6">Delivery Earnings</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow p-5"><p className="text-gray-500 text-sm font-semibold mb-1">Total Delivery Charges</p><p className="text-2xl font-bold text-orange-600">{fmt(totals.total)}</p></div>
          <div className="bg-white rounded-xl shadow p-5"><p className="text-gray-500 text-sm font-semibold mb-1">Partner Earnings</p><p className="text-2xl font-bold text-blue-600">{fmt(totals.partner)}</p></div>
          <div className="bg-white rounded-xl shadow p-5"><p className="text-gray-500 text-sm font-semibold mb-1">Platform Earnings</p><p className="text-2xl font-bold text-green-600">{fmt(totals.admin)}</p></div>
        </div>
        {loading ? <div className="text-center py-8 text-gray-500">Loading…</div> : earnings.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">No earnings records yet.</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b bg-gray-50 text-left">
                <th className="px-4 py-3 text-sm font-semibold">Order</th>
                <th className="px-4 py-3 text-sm font-semibold">Partner</th>
                <th className="px-4 py-3 text-sm font-semibold">Total</th>
                <th className="px-4 py-3 text-sm font-semibold">Partner</th>
                <th className="px-4 py-3 text-sm font-semibold">Platform</th>
                <th className="px-4 py-3 text-sm font-semibold">Status</th>
              </tr></thead>
              <tbody>
                {earnings.map((e) => (
                  <tr key={e._id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold">#{typeof e.order === "object" ? (e.order as any)?._id?.slice(-6) : e.order?.slice(-6)}</td>
                    <td className="px-4 py-3 text-sm">{typeof e.partner === "object" ? (e.partner as any)?.name : "—"}</td>
                    <td className="px-4 py-3 text-sm">{fmt(e.totalDeliveryCharge)}</td>
                    <td className="px-4 py-3 text-sm text-blue-600 font-semibold">{fmt(e.partnerEarning)}</td>
                    <td className="px-4 py-3 text-sm text-green-600 font-semibold">{fmt(e.adminEarning)}</td>
                    <td className="px-4 py-3 text-sm"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${e.status === "paid" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>{e.status || "pending"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
