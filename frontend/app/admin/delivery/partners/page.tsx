"use client";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { deliveryAPI } from "@/lib/api";
import { AdminNav } from "@/components/Navs";
import Link from "next/link";
import { Search, Filter, MoreVertical, CheckCircle2, XCircle, Ban, UserCheck, Bike, Eye } from "lucide-react";
import type { DeliveryPartnerProfile } from "@/types";
import { PARTNER_STATUS_STYLES, VEHICLE_LABELS, fmt } from "@/lib/deliveryUI";

export default function AdminDeliveryPartners() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [partners, setPartners] = useState<DeliveryPartnerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [menu, setMenu] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) router.push("/login");
  }, [user, authLoading, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p: Record<string, any> = {};
      if (search.trim()) p.search = search.trim();
      if (statusFilter !== "all") p.status = statusFilter;
      const res = await deliveryAPI.getPartners(p);
      setPartners(res.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [search, statusFilter]);

  useEffect(() => { if (!authLoading && user?.role === "admin") load(); }, [authLoading, user, load]);

  const act = async (fn: () => Promise<any>) => {
    try { await fn(); setMenu(null); load(); }
    catch (e: any) { alert(e.message); setMenu(null); }
  };

  if (authLoading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <div className="max-w-7xl mx-auto p-4 sm:p-8">
        <h1 className="text-2xl font-bold mb-1">Delivery Partners</h1>
        <Link href="/admin/delivery/pending" className="text-sm text-orange-600 hover:underline">View Pending →</Link>
        <div className="flex flex-col sm:flex-row gap-3 my-6">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, phone, city…"
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
          <div className="relative">
            <Filter size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-orange-500">
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="active">Active</option>
              <option value="busy">Busy</option>
              <option value="offline">Offline</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>

        {loading ? <div className="text-center py-8 text-gray-500">Loading…</div> : (
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b bg-gray-50 text-left">
                <th className="px-4 py-3 text-sm font-semibold">Partner</th>
                <th className="px-4 py-3 text-sm font-semibold">Vehicle</th>
                <th className="px-4 py-3 text-sm font-semibold">Status</th>
                <th className="px-4 py-3 text-sm font-semibold">Deliveries</th>
                <th className="px-4 py-3 text-sm font-semibold">Earnings</th>
                <th className="px-4 py-3 text-sm font-semibold">Actions</th>
              </tr></thead>
              <tbody>
                {partners.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No partners found.</td></tr>
                ) : partners.map((p) => {
                  const u = typeof p.user === "object" ? p.user : null;
                  return (
                    <tr key={p._id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3"><div className="flex items-center gap-3">
                        <span className="h-9 w-9 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm shrink-0">{u?.name?.charAt(0) || "?"}</span>
                        <div><p className="font-semibold text-sm">{u?.name || "—"}</p><p className="text-xs text-gray-500">{u?.phone || "—"} {p.city ? `· ${p.city}` : ""}</p></div>
                      </div></td>
                      <td className="px-4 py-3 text-sm"><span className="flex items-center gap-1"><Bike size={13} className="text-gray-400" /> {VEHICLE_LABELS[p.vehicleType || "bike"]} {p.vehicleNumber ? `· ${p.vehicleNumber}` : ""}</span></td>
                      <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${PARTNER_STATUS_STYLES[p.status || "pending"]}`}>{(p.status || "pending").replace(/_/g, " ")}</span></td>
                      <td className="px-4 py-3 text-sm">{p.completedDeliveries || 0} done{p.activeDeliveries ? <span className="text-orange-600"> · {p.activeDeliveries} active</span> : null}</td>
                      <td className="px-4 py-3 text-sm font-semibold">{fmt(p.totalEarnings)}</td>
                      <td className="px-4 py-3 relative">
                        <button onClick={() => setMenu(menu === p._id ? null : p._id)} className="p-1.5 hover:bg-gray-100 rounded-lg"><MoreVertical size={16} /></button>
                        {menu === p._id && (
                          <div className="absolute right-4 top-10 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-44">
                            <Link href={`/admin/delivery/partners/${p._id}`} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50" onClick={() => setMenu(null)}><Eye size={14} /> View Profile</Link>
                            {p.status === "pending" && (<>
                              <button onClick={() => act(() => deliveryAPI.approvePartner(p._id))} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 w-full text-left text-green-700"><CheckCircle2 size={14} /> Approve</button>
                              <button onClick={() => { const r = prompt("Rejection reason:"); if (r) act(() => deliveryAPI.rejectPartner(p._id, { reason: r })); }} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 w-full text-left text-red-600"><XCircle size={14} /> Reject</button>
                            </>)}
                            {p.status !== "suspended" && p.status !== "pending" && (
                              <button onClick={() => { const r = prompt("Suspension reason:"); if (r) act(() => deliveryAPI.suspendPartner(p._id, { reason: r })); }} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 w-full text-left text-red-600"><Ban size={14} /> Suspend</button>
                            )}
                            {(p.status === "suspended" || p.status === "offline") && (
                              <button onClick={() => act(() => deliveryAPI.activatePartner(p._id))} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 w-full text-left text-green-700"><UserCheck size={14} /> Activate</button>
                            )}
                          </div>
                        )}
                      </td>
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
