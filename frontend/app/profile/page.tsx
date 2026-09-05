"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { CustomerNav } from "@/components/Navs";
import Link from "next/link";
import { MapPin, Plus, Trash2 } from "lucide-react";

export default function ProfilePage() {
  const { user, updateProfile, logout, loading } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState({ name: "", phone: "", city: "" });
  const [addresses, setAddresses] = useState<any[]>([]);
  const [newAddress, setNewAddress] = useState({ label: "", line: "", city: "", zip: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      setFormData({ name: user.name || "", phone: user.phone || "", city: user.city || "" });
      setAddresses((user as any).addresses || []);
    } else if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  const handleSaveAddresses = async (nextAddresses: any[]) => {
    setSaving(true);
    try {
      await updateProfile({ addresses: nextAddresses } as any);
      setAddresses(nextAddresses);
      alert("Addresses updated!");
    } catch (error: any) {
      alert(error.message || "Error updating addresses");
    } finally {
      setSaving(false);
    }
  };

  const addAddress = () => {
    if (!newAddress.line.trim()) {
      alert("Address line is required");
      return;
    }
    const next = [
      ...addresses,
      {
        label: newAddress.label || "Address",
        line: newAddress.line,
        city: newAddress.city || formData.city,
        zip: newAddress.zip,
        phone: formData.phone,
        isDefault: addresses.length === 0,
      },
    ];
    setNewAddress({ label: "", line: "", city: "", zip: "" });
    handleSaveAddresses(next);
  };

  const removeAddress = (idx: number) => {
    handleSaveAddresses(addresses.filter((_, i) => i !== idx));
  };

  const setDefaultAddress = (idx: number) => {
    handleSaveAddresses(addresses.map((a, i) => ({ ...a, isDefault: i === idx })));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({ ...formData, addresses } as any);
      alert("Profile updated successfully!");
    } catch (error: any) {
      alert(error.message || "Error updating profile");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CustomerNav />

      <div className="max-w-2xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-8">My Profile</h1>

        <div className="bg-white p-8 rounded-lg shadow mb-8">
          <div className="mb-6 pb-6 border-b">
            <p className="text-gray-600">Email</p>
            <p className="text-lg font-semibold">{user?.email}</p>
          </div>

          <div className="mb-6 pb-6 border-b">
            <p className="text-gray-600">Account Type</p>
            <p className="text-lg font-semibold capitalize">{user?.role}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
              <input type="text" value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Phone</label>
              <input type="tel" value={formData.phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">City</label>
              <input type="text" value={formData.city}
                onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>

            <button type="submit" disabled={saving}
              className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white font-bold py-2 rounded-lg transition">
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </div>

        {/* Saved addresses */}
        <div className="bg-white p-8 rounded-lg shadow mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <MapPin size={18} className="text-orange-600" /> Saved Addresses
          </h2>

          {addresses.length === 0 && (
            <p className="text-gray-500 text-sm mb-4">No saved addresses yet — add one below.</p>
          )}

          <div className="space-y-3 mb-4">
            {addresses.map((addr: any, idx: number) => (
              <div key={idx} className="flex justify-between items-start border border-gray-200 rounded-lg p-3">
                <div>
                  <p className="font-semibold text-sm">
                    {addr.label || "Address"}
                    {addr.isDefault && (
                      <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Default</span>
                    )}
                  </p>
                  <p className="text-sm text-gray-600">{addr.line}{addr.city ? `, ${addr.city}` : ""}{addr.zip ? ` ${addr.zip}` : ""}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {!addr.isDefault && (
                    <button onClick={() => setDefaultAddress(idx)} className="text-xs text-orange-600 hover:underline font-semibold">
                      Set default
                    </button>
                  )}
                  <button onClick={() => removeAddress(idx)} className="text-red-500 hover:text-red-700" title="Remove">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t pt-4 grid grid-cols-2 gap-3">
            <input value={newAddress.label} onChange={(e) => setNewAddress((p) => ({ ...p, label: e.target.value }))}
              placeholder="Label (Home / Work)" className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            <input value={newAddress.zip} onChange={(e) => setNewAddress((p) => ({ ...p, zip: e.target.value }))}
              placeholder="ZIP code" className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            <input value={newAddress.line} onChange={(e) => setNewAddress((p) => ({ ...p, line: e.target.value }))}
              placeholder="Street address *" className="px-3 py-2 border border-gray-300 rounded-lg text-sm col-span-2" />
            <input value={newAddress.city} onChange={(e) => setNewAddress((p) => ({ ...p, city: e.target.value }))}
              placeholder="City" className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            <button onClick={addAddress} disabled={saving}
              className="flex items-center justify-center gap-1 bg-gray-100 hover:bg-orange-50 hover:text-orange-600 text-sm font-bold py-2 rounded-lg border border-gray-300">
              <Plus size={15} /> Add address
            </button>
          </div>
        </div>

        <div className="bg-white p-8 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Quick Links</h2>
          <div className="space-y-2">
            {user?.role === "customer" && (
              <>
                <Link href="/dashboard" className="block text-orange-600 hover:underline">My Orders</Link>
                <Link href="/bookings" className="block text-orange-600 hover:underline">My Bookings</Link>
                <Link href="/restaurants" className="block text-orange-600 hover:underline">Browse Restaurants</Link>
              </>
            )}
            {user?.role === "owner" && (
              <>
                <Link href="/owner/dashboard" className="block text-orange-600 hover:underline">Restaurant Dashboard</Link>
                <Link href="/owner/menu" className="block text-orange-600 hover:underline">Manage Menu</Link>
                <Link href="/owner/bookings" className="block text-orange-600 hover:underline">Manage Bookings</Link>
              </>
            )}
            {user?.role === "admin" && (
              <>
                <Link href="/admin" className="block text-orange-600 hover:underline">Admin Dashboard</Link>
              </>
            )}
            <button
              onClick={handleLogout}
              className="mt-4 w-full border border-red-200 text-red-600 hover:bg-red-50 font-semibold py-2.5 rounded-lg transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
