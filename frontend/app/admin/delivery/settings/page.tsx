"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { deliveryAPI } from "@/lib/api";
import { AdminNav } from "@/components/Navs";
import { Save, DollarSign, Bike, Percent } from "lucide-react";
import type { DeliverySettingsData, PartnerCommissionMode } from "@/types";

export default function AdminDeliverySettings() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [settings, setSettings] = useState<DeliverySettingsData>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) router.push("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!authLoading && user?.role === "admin") {
      deliveryAPI.getSettings().then((res) => setSettings(res.data || {})).catch(console.error);
    }
  }, [authLoading, user]);

  const update = (key: string, value: any) => setSettings((s) => ({ ...s, [key]: value }));

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await deliveryAPI.updateSettings(settings as Record<string, unknown>);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) { alert(e.message); }
    finally { setSaving(false); }
  };

  if (authLoading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <div className="max-w-3xl mx-auto p-4 sm:p-8">
        <h1 className="text-2xl font-bold mb-6">Delivery Settings</h1>
        <div className="bg-white rounded-xl shadow p-6 space-y-6">
          <h2 className="font-semibold text-lg flex items-center gap-2"><DollarSign size={18} /> Delivery Fees</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Base Fee (₹)</label><input type="number" value={settings.baseFee || 0} onChange={(e) => update("baseFee", Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Per Km Fee (₹)</label><input type="number" value={settings.perKmFee || 0} onChange={(e) => update("perKmFee", Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Minimum Fee (₹)</label><input type="number" value={settings.minFee || 0} onChange={(e) => update("minFee", Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Maximum Fee (₹)</label><input type="number" value={settings.maxFee || 0} onChange={(e) => update("maxFee", Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
          </div>

          <h2 className="font-semibold text-lg flex items-center gap-2 pt-4 border-t"><Bike size={18} /> Partner Commission</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Commission Mode</label>
            <select value={settings.partnerCommissionMode || "percentage"} onChange={(e) => update("partnerCommissionMode", e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="percentage">Percentage of delivery fee</option>
              <option value="fixed">Fixed amount per delivery</option>
              <option value="distance">Distance-based amount</option>
            </select>
          </div>
          {settings.partnerCommissionMode === "percentage" && (
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Partner Commission (%)</label><input type="number" value={settings.partnerCommissionPercent || 0} onChange={(e) => update("partnerCommissionPercent", Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
          )}
          {settings.partnerCommissionMode === "fixed" && (
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Fixed Amount (₹)</label><input type="number" value={settings.partnerFixedAmount || 0} onChange={(e) => update("partnerFixedAmount", Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>
          )}
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Platform Commission (%)</label><input type="number" value={settings.platformCommissionPercent || 0} onChange={(e) => update("platformCommissionPercent", Number(e.target.value))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /></div>

          <div className="pt-4 border-t">
            <button onClick={save} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 disabled:opacity-50">
              <Save size={16} /> {saving ? "Saving…" : "Save Settings"}
            </button>
            {saved && <span className="ml-3 text-green-600 text-sm font-semibold">✓ Saved successfully</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
