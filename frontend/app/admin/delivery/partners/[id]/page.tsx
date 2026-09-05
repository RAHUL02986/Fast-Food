"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter, useParams } from "next/navigation";
import { deliveryAPI } from "@/lib/api";
import { AdminNav } from "@/components/Navs";
import Link from "next/link";
import { ArrowLeft, Bike, MapPin, Phone, Mail, Calendar, DollarSign, CheckCircle2, XCircle, Ban, UserCheck, Clock } from "lucide-react";
import type { DeliveryPartnerProfile } from "@/types";
import { PARTNER_STATUS_STYLES, VEHICLE_LABELS, fmt, fmtDate } from "@/lib/deliveryUI";

export default function AdminPartnerProfile() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [partner, setPartner] = useState<DeliveryPartnerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) router.push("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!authLoading && user?.role === "admin" && id) {
      deliveryAPI.getPartner(id).then((res) => setPartner(res.data as DeliveryPartnerProfile)).catch(console.error).finally(() => setLoading(false));
    }
  }, [authLoading, user, id]);

  const act = async (fn: () => Promise<any>) => {
    try { await fn(); const res = await deliveryAPI.getPartner(id); setPartner(res.data as DeliveryPartnerProfile); }
    catch (e: any) { alert(e.message); }
  };

  if (authLoading || loading) return <div className="p-8 text-center">Loading...</div>;
  if (!partner) return <div className="p-8 text-center">Partner not found.</div>;

  const u = typeof partner.user === "object" ? partner.user : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <div className="max-w-4xl mx-auto p-4 sm:p-8">
        <Link href="/admin/delivery/partners" className="text-sm text-orange-600 hover:underline flex items-center gap-1 mb-4"><ArrowLeft size={14} /> Back to Partners</Link>

        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
            <span className="h-16 w-16 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-2xl shrink-0">{u?.name?.charAt(0) || "?"}</span>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{u?.name || "—"}</h1>
              <p className="text-gray-500 text-sm">{partner.city || "—"}</p>
              <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold ${PARTNER_STATUS_STYLES[partner.status || "pending"]}`}>{(partner.status || "pending").replace(/_/g, " ")}</span>
            </div>
            <div className="flex gap-2">
              {partner.status === "pending" && (<>
                <button onClick={() => act(() => deliveryAPI.approvePartner(id))} className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg text-sm"><CheckCircle2 size={14} /> Approve</button>
                <button onClick={() => { const r = prompt("Rejection reason:"); if (r) act(() => deliveryAPI.rejectPartner(id, { reason: r })); }} className="flex items-center gap-1 px-3 py-2 bg-red-600 text-white rounded-lg text-sm"><XCircle size={14} /> Reject</button>
              </>)}
              {partner.status !== "suspended" && partner.status !== "pending" && (
                <button onClick={() => { const r = prompt("Suspension reason:"); if (r) act(() => deliveryAPI.suspendPartner(id, { reason: r })); }} className="flex items-center gap-1 px-3 py-2 bg-red-600 text-white rounded-lg text-sm"><Ban size={14} /> Suspend</button>
              )}
              {(partner.status === "suspended" || partner.status === "offline") && (
                <button onClick={() => act(() => deliveryAPI.activatePartner(id))} className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg text-sm"><UserCheck size={14} /> Activate</button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-gray-600"><Phone size={14} /> {u?.phone || "—"}</div>
            <div className="flex items-center gap-2 text-gray-600"><Mail size={14} /> {u?.email || "—"}</div>
            <div className="flex items-center gap-2 text-gray-600"><Bike size={14} /> {VEHICLE_LABELS[partner.vehicleType || "bike"]} · {partner.vehicleNumber || "—"}</div>
            <div className="flex items-center gap-2 text-gray-600"><MapPin size={14} /> {partner.address || "—"} {partner.city ? `, ${partner.city}` : ""}</div>
            <div className="flex items-center gap-2 text-gray-600"><Calendar size={14} /> Joined: {fmtDate(partner.createdAt)}</div>
            <div className="flex items-center gap-2 text-gray-600"><Clock size={14} /> Last Active: {fmtDate(partner.lastActiveAt)}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow p-4"><p className="text-gray-500 text-xs font-semibold mb-1">Total Deliveries</p><p className="text-xl font-bold">{partner.totalDeliveries || 0}</p></div>
          <div className="bg-white rounded-xl shadow p-4"><p className="text-gray-500 text-xs font-semibold mb-1">Completed</p><p className="text-xl font-bold text-green-600">{partner.completedDeliveries || 0}</p></div>
          <div className="bg-white rounded-xl shadow p-4"><p className="text-gray-500 text-xs font-semibold mb-1">Cancelled</p><p className="text-xl font-bold text-red-600">{partner.cancelledDeliveries || 0}</p></div>
          <div className="bg-white rounded-xl shadow p-4"><p className="text-gray-500 text-xs font-semibold mb-1">Total Earnings</p><p className="text-xl font-bold text-orange-600">{fmt(partner.totalEarnings)}</p></div>
        </div>
      </div>
    </div>
  );
}
