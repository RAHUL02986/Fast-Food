"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { deliveryAPI } from "@/lib/api";
import { AdminNav } from "@/components/Navs";
import { DollarSign, CheckCircle2, Clock, Users } from "lucide-react";
import type { PayoutRecord } from "@/types";
import { fmt, fmtDate } from "@/lib/deliveryUI";

export default function AdminPayouts() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingTotal, setPendingTotal] = useState(0);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) router.push("/login");
  }, [user, authLoading, router]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await deliveryAPI.getPayouts();
      setPayouts(res.data?.payouts || []);
      setPendingTotal(res.data?.pendingTotal || 0);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (!authLoading && user?.role === "admin") load(); }, [authLoading, user]);

  const markPaid = async (id: string) => {
    if (!confirm("Mark this payout as completed?")) return;
    try { await deliveryAPI.markPayoutPaid(id); load(); }
    catch (e: any) { alert(e.message); }
  };

  if (authLoading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <div className="max-w-7xl mx-auto p-4 sm:p-8">
        <h1 className="text-2xl font-bold mb-6">Payouts</h1>
        <div className="bg-white rounded-xl shadow p-5 mb-6"><p className="text-gray-500 text-sm font-semibold mb-1">Pending Payout Total</p><p className="text-2xl font-bold text-orange-600">{fmt(pendingTotal)}</p></div>
        {loading ? <div className="text-center py-8 text-gray-500">Loading…</div> : payouts.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">No payout records yet.</div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b bg-gray-50 text-left">
                <th className="px-4 py-3 text-sm font-semibold">Partner</th>
                <th className="px-4 py-3 text-sm font-semibold">Amount</th>
                <th className="px-4 py-3 text-sm font-semibold">Deliveries</th>
                <th className="px-4 py-3 text-sm font-semibold">Status</th>
                <th className="px-4 py-3 text-sm font-semibold">Date</th>
                <th className="px-4 py-3 text-sm font-semibold">Actions</th>
              </tr></thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p._id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{typeof p.partner === "object" ? (p.partner as any)?.name : "—"}</td>
                    <td className="px-4 py-3 text-sm font-semibold">{fmt(p.amount)}</td>
                    <td className="px-4 py-3 text-sm">{p.deliveryCount || 0}</td>
                    <td className="px-4 py-3 text-sm"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${p.status === "completed" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>{p.status || "pending"}</span></td>
                    <td className="px-4 py-3 text-sm">{fmtDate(p.createdAt)}</td>
                    <td className="px-4 py-3 text-sm">{p.status !== "completed" && <button onClick={() => markPaid(p._id)} className="flex items-center gap-1 text-green-700 hover:text-green-800"><CheckCircle2 size={14} /> Mark Paid</button>}</td>
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
