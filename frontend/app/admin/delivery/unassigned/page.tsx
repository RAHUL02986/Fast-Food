"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { deliveryAPI } from "@/lib/api";
import { AdminNav } from "@/components/Navs";
import { Package, User, MapPin, DollarSign } from "lucide-react";
import type { Order } from "@/types";
import { fmt, addressLine } from "@/lib/deliveryUI";
import AssignDeliveryModal from "@/components/AssignDeliveryModal";

export default function AdminUnassignedOrders() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) router.push("/login");
  }, [user, authLoading, router]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await deliveryAPI.getUnassignedOrders();
      setOrders(res.data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (!authLoading && user?.role === "admin") load(); }, [authLoading, user]);

  if (authLoading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <div className="max-w-7xl mx-auto p-4 sm:p-8">
        <h1 className="text-2xl font-bold mb-6">Unassigned Orders</h1>
        {loading ? <div className="text-center py-8 text-gray-500">Loading…</div> : orders.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">All orders have been assigned.</div>
        ) : (
          <div className="grid gap-4">
            {orders.map((o) => (
              <div key={o._id} className="bg-white rounded-lg shadow p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">Order #{o._id?.slice(-6)}</p>
                  <p className="text-sm text-gray-500 flex items-center gap-1 mt-1"><User size={13} /> {typeof o.customer === "object" ? (o.customer as any)?.name : "—"}</p>
                  <p className="text-sm text-gray-500 flex items-center gap-1 mt-1"><MapPin size={13} /> {addressLine(o.deliveryAddress)}</p>
                  <p className="text-sm text-gray-500 flex items-center gap-1 mt-1"><DollarSign size={13} /> {fmt(o.total)}</p>
                </div>
                <button onClick={() => setSelectedOrder(o)} className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700">Assign Partner</button>
              </div>
            ))}
          </div>
        )}
        {selectedOrder && <AssignDeliveryModal order={selectedOrder} onClose={() => setSelectedOrder(null)} onAssigned={() => { setSelectedOrder(null); load(); }} />}
      </div>
    </div>
  );
}
