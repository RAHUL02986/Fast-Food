"use client";
import { useCallback, useEffect, useState } from "react";
import { Bike, MapPin, Phone, Search, User, X } from "lucide-react";
import { deliveryAPI } from "@/lib/api";
import type { AvailablePartner, Order } from "@/types";
import { DELIVERY_STATUS_LABELS, addressLine, fmt } from "@/lib/deliveryUI";
import { secureImageUrl } from "@/lib/images";

interface Props {
  order: Order;
  onClose: () => void;
  onAssigned: () => void;
}

export default function AssignDeliveryModal({ order, onClose, onAssigned }: Props) {
  const orderId = order._id;
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<string>("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [orderData, setOrderData] = useState<Order | null>(order);
  const [partners, setPartners] = useState<AvailablePartner[]>([]);

  const load = useCallback(async () => {
    setError("");
    try {
      const data = await deliveryAPI.getAvailablePartners(orderId);
      setOrderData(data.data.order);
      setPartners(data.data.partners || []);
    } catch (err: any) {
      setError(err.message || "Failed to load available partners");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => { load(); }, [load]);

  const assign = async (partnerId: string, partnerName: string) => {
    if (!confirm(`Assign this delivery to ${partnerName}?`)) return;
    setAssigning(partnerId);
    setError("");
    try {
      const res = await deliveryAPI.assignDelivery(orderId, partnerId);
      alert(res.message || "Delivery assigned successfully");
      onAssigned();
      onClose();
    } catch (err: any) {
      setError(err.message || "Assignment failed");
    } finally {
      setAssigning("");
    }
  };

  const filtered = partners.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.user?.name?.toLowerCase().includes(q) ||
      p.user?.phone?.includes(q) ||
      p.city?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="text-lg font-bold">Assign Delivery Partner</h2>
            <p className="text-sm text-gray-500">
              Order {orderData?.orderNumber || ""} · {DELIVERY_STATUS_LABELS[orderData?.delivery?.status || "unassigned"]}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={18} />
          </button>
        </div>

        <div className="p-4 border-b">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, phone or city…"
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        <div className="overflow-y-auto p-4 flex-1">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg mb-3 text-sm">{error}</div>
          )}
          {loading ? (
            <p className="text-center text-gray-500 py-8">Loading available partners…</p>
          ) : filtered.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <User size={28} className="mx-auto mb-2 text-gray-300" />
              <p>No approved delivery partners available.</p>
              <p className="text-xs mt-1">Approve delivery partner applications first.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((p) => (
                <div
                  key={p._id}
                  className={`border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-3 ${
                    p.isAvailable ? "border-green-200 bg-green-50/40" : "border-gray-200"
                  }`}
                >
                  {p.user?.avatar ? (
                    <img src={secureImageUrl(p.user.avatar)} alt="" className="h-11 w-11 rounded-full object-cover" />
                  ) : (
                    <span className="h-11 w-11 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                      {p.user?.name?.charAt(0)?.toUpperCase() || "?"}
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold flex items-center gap-2 flex-wrap">
                      {p.user?.name}
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        p.isAvailable ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
                      }`}>
                        {p.isAvailable ? "AVAILABLE" : (p.status || "offline").toUpperCase()}
                      </span>
                    </p>
                    <p className="text-xs text-gray-500 flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                      <span className="flex items-center gap-1"><Phone size={11} /> {p.user?.phone || "—"}</span>
                      <span className="flex items-center gap-1"><Bike size={11} /> {p.vehicleType || "bike"}{p.vehicleNumber ? ` · ${p.vehicleNumber}` : ""}</span>
                      <span>🚚 Active: <strong>{p.activeDeliveries}</strong></span>
                      {p.currentLocation && (
                        <span className="flex items-center gap-1"><MapPin size={11} /> Live location</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {p.distanceFromRestaurant !== null && p.distanceFromRestaurant !== undefined
                        ? `📍 ${p.distanceFromRestaurant} km from restaurant`
                        : "📍 Distance unknown (no live location)"}
                      {p.distanceToCustomer !== null && p.distanceToCustomer !== undefined
                        ? ` · 🏠 ${p.distanceToCustomer} km to customer`
                        : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => assign(p._id, p.user?.name || "partner")}
                    disabled={assigning === p._id}
                    className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 text-white px-4 py-2.5 rounded-lg font-semibold text-sm transition whitespace-nowrap"
                  >
                    {assigning === p._id ? "Assigning…" : "Assign Delivery"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {orderData?.assignmentHistory && orderData.assignmentHistory.length > 0 && (
          <div className="border-t p-4 max-h-36 overflow-y-auto">
            <p className="text-xs font-semibold text-gray-500 mb-2">ASSIGNMENT HISTORY</p>
            {orderData.assignmentHistory.map((h: any, i: number) => (
              <p key={i} className="text-xs text-gray-500">
                • {(typeof h.partner === "object" ? h.partner?.name : "Partner") || "Partner"} — {h.outcome}
                {h.reason ? ` (${h.reason})` : ""} · {h.assignedAt ? new Date(h.assignedAt).toLocaleString("en-IN") : ""}
              </p>
            ))}
          </div>
        )}

        <div className="border-t p-4 text-xs text-gray-400">
          Delivery fee {fmt(orderData?.delivery?.fee)} · Partner earning {fmt(orderData?.delivery?.partnerEarning)} · Platform{" "}
          {fmt(orderData?.delivery?.adminEarning)} · {orderData?.delivery?.distanceKm ?? "—"} km · Customer: {addressLine(orderData?.deliveryAddress)}
        </div>
      </div>
    </div>
  );
}
