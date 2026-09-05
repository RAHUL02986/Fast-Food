"use client";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { deliveryAPI } from "@/lib/api";
import { AdminNav } from "@/components/Navs";
import { CheckCircle2, XCircle, Clock, Bike } from "lucide-react";
import type { DeliveryPartnerProfile } from "@/types";
import { VEHICLE_LABELS, fmtDate } from "@/lib/deliveryUI";

export default function AdminPendingPartners() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [partners, setPartners] = useState<DeliveryPartnerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { if (!authLoading && (!user || user.role !== "admin")) router.push("/login"); }, [user, authLoading, router]);
  const load = useCallback(async () => { setLoading(true); try { const res = await deliveryAPI.getPartners({ status: "pending" }); setPartners(res.data || []); } catch (e) { console.error(e); } finally { setLoading(false); } }, []);
  useEffect(() => { if (!authLoading && user?.role === "admin") load(); }, [authLoading, user, load]);
  const act = async (fn: () => Promise<any>) => { try { await fn(); load(); } catch (e: any) { alert(e.message); } };
  if (authLoading) return <div className="p-8 text-center">Loading...</div>;
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <div className="max-w-7xl mx-auto p-4 sm:p-8">
        <h1 className="text-2xl font-bold mb-6">Pending Approvals</h1>
        {loading ? <div className="text-center py-8 text-gray-500">Loading...</div> : partners.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">No pending approvals.</div>
        ) : (
          <div className="grid gap-4">
            {partners.map((p) => {
              const u = typeof p.user === "object" ? p.user : null;
              return (
                <div key={p._id} className="bg-white rounded-lg shadow p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                  <span className="h-12 w-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-lg shrink-0">{u?.name?.charAt(0) || "?"}</span>
                  <div className="flex-1">
                    <p className="font-semibold">{u?.name || "—"}</p>
                    <p className="text-sm text-gray-500">{u?.email} · {u?.phone}</p>
                    <p className="text-sm text-gray-500"><Bike size={13} className="inline mr-1" />{VEHICLE_LABELS[p.vehicleType || "bike"]} · {p.vehicleNumber} · {p.city}</p>
                    <p className="text-xs text-gray-400 mt-1"><Clock size={11} className="inline mr-1" />Applied {fmtDate(p.createdAt)}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => act(() => deliveryAPI.approvePartner(p._id))} className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700"><CheckCircle2 size={15} /> Approve</button>
                    <button onClick={() => { const r = prompt("Rejection reason:"); if (r) act(() => deliveryAPI.rejectPartner(p._id, { reason: r })); }} className="flex items-center gap-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700"><XCircle size={15} /> Reject</button>
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

