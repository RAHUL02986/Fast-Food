"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { restaurantAPI, adminAPI } from "@/lib/api";
import { AdminNav } from "@/components/Navs";
import Link from "next/link";
import { Mail } from "lucide-react";

/** Build a `mailto:` link that pre-fills recipient, subject and body. */
const buildMailto = (to: string, subject: string, body: string) =>
  `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

export default function AdminRestaurants() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [editingAddrId, setEditingAddrId] = useState<string | null>(null);
  const [addrForm, setAddrForm] = useState({ location: "", city: "", latitude: "", longitude: "" });
  const [savingAddr, setSavingAddr] = useState(false);

  // Passwords are stored as one-way bcrypt hashes — they can never be revealed,
  // only REPLACED. Admin sets a brand-new password the owner can sign in with.
  const resetOwnerPassword = async (restaurant: any) => {
    const ownerId = restaurant.owner?._id || restaurant.owner;
    if (!ownerId) {
      alert("No owner account is linked to this restaurant.");
      return;
    }
    const newPassword = prompt(
      `Set a NEW password for ${restaurant.owner?.email || restaurant.owner?.name || "this owner"}.\nMinimum 8 characters.\n\n(Existing passwords are encrypted and can never be viewed — only replaced.)`
    );
    if (newPassword === null) return;
    if (newPassword.length < 8) {
      alert("Password must be at least 8 characters.");
      return;
    }
    try {
      const res = await adminAPI.resetUserPassword(ownerId, newPassword);
      alert(res.message || "Password reset — the owner can now sign in with the new password.");
    } catch (error: any) {
      alert(error.message || "Error resetting password");
    }
  };

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  const fetchRestaurants = async (statusFilter?: string) => {
    try {
      const data = await restaurantAPI.getAllRestaurantsAdmin({ status: statusFilter === "all" ? undefined : statusFilter });
      setRestaurants(data.data || []);
    } catch (error) {
      console.error("Error fetching restaurants:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user?.role === "admin") {
      setLoading(true);
      fetchRestaurants(filter);
    }
  }, [authLoading, user, filter]);

  const handleApprove = async (restaurantId: string) => {
    try {
      await restaurantAPI.approveRestaurant(restaurantId);
      setRestaurants((prev) =>
        prev.map((r) => (r._id === restaurantId ? { ...r, status: "approved", verified: true } : r))
      );
      alert("Restaurant approved!");
    } catch (error: any) {
      alert(error.message || "Error approving restaurant");
    }
  };

  const handleReject = async (restaurantId: string) => {
    const reason = prompt("Enter rejection reason:");
    if (!reason) return;

    try {
      await restaurantAPI.rejectRestaurant(restaurantId, { rejectionReason: reason });
      setRestaurants((prev) =>
        prev.map((r) => (r._id === restaurantId ? { ...r, status: "rejected" } : r))
      );
      alert("Restaurant rejected!");
    } catch (error: any) {
      alert(error.message || "Error rejecting restaurant");
    }
  };

  const toggleActive = async (restaurant: any) => {
    const next = !restaurant.isActive;
    let reason;
    if (!next) {
      reason = prompt("Reason for suspending this restaurant:");
      if (reason === null) return;
    }
    try {
      await adminAPI.setRestaurantActive(restaurant._id, { isActive: next, reason });
      setRestaurants((prev) =>
        prev.map((r) => (r._id === restaurant._id ? { ...r, isActive: next } : r))
      );
      alert(next ? "Restaurant activated" : "Restaurant suspended");
    } catch (error: any) {
      alert(error.message || "Error updating restaurant");
    }
  };

  const startEditAddress = (restaurant: any) => {
    setEditingAddrId(restaurant._id);
    setAddrForm({
      location: restaurant.location || "",
      city: restaurant.city || "",
      latitude: restaurant.latitude?.toString() ?? "",
      longitude: restaurant.longitude?.toString() ?? "",
    });
  };

  const cancelEditAddress = () => {
    setEditingAddrId(null);
    setAddrForm({ location: "", city: "", latitude: "", longitude: "" });
  };

  const saveAddress = async (restaurantId: string) => {
    if ((addrForm.latitude === "") !== (addrForm.longitude === "")) {
      alert("Please provide both latitude and longitude together (or leave both empty).");
      return;
    }
    const payload: any = { location: addrForm.location.trim(), city: addrForm.city.trim() };
    if (addrForm.latitude !== "") {
      payload.latitude = parseFloat(addrForm.latitude);
      payload.longitude = parseFloat(addrForm.longitude);
      if (Number.isNaN(payload.latitude) || Number.isNaN(payload.longitude)) {
        alert("Latitude and longitude must be numbers (e.g. 19.0760 / 72.8777).");
        return;
      }
    }
    try {
      setSavingAddr(true);
      const res = await restaurantAPI.updateRestaurant(restaurantId, payload);
      setRestaurants((prev) =>
        prev.map((r) => (r._id === restaurantId ? { ...r, ...res.data } : r))
      );
      cancelEditAddress();
      alert("Address saved successfully!");
    } catch (error: any) {
      alert(error.message || "Error saving address");
    } finally {
      setSavingAddr(false);
    }
  };

  if (authLoading || loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />

      <div className="max-w-7xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-8">Manage Restaurants</h1>

        {/* Status filters */}
        <div className="flex flex-wrap items-center gap-3 mb-8">
          {["all", "pending", "approved", "rejected"].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded font-semibold ${
                filter === status
                  ? "bg-orange-600 text-white"
                  : "bg-white text-gray-700 border border-gray-300 hover:border-orange-600"
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
          <span className="text-xs text-gray-500">
            Owner passwords are one-way encrypted and can never be viewed — use &ldquo;Reset
            Password&rdquo; on a card to set a new one.
          </span>
        </div>

        {/* Restaurants List */}
        <div className="bg-white rounded-lg shadow">
          {restaurants.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No restaurants found</div>
          ) : (
            <div className="divide-y">
              {restaurants.map((restaurant) => (
                <div key={restaurant._id} className="p-6 hover:bg-gray-50">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-xl font-bold">{restaurant.name}</h3>
                      <p className="text-gray-600">{restaurant.location}</p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded text-sm font-semibold ${
                        restaurant.status === "approved"
                          ? "bg-green-100 text-green-800"
                          : restaurant.status === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {restaurant.status.charAt(0).toUpperCase() + restaurant.status.slice(1)}
                    </span>
                  </div>

                  <div className="grid grid-cols-5 gap-4 text-sm mb-4">
                    <div>
                      <p className="text-gray-600">Owner</p>
                      <p className="font-semibold">{restaurant.owner?.name}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Email</p>
                      {restaurant.owner?.email ? (
                        <a
                          href={buildMailto(
                            restaurant.owner.email,
                            `Regarding ${restaurant.name}`,
                            `Hi ${restaurant.owner?.name || "there"},\n\nI hope you're doing well.\n`
                          )}
                          className="font-semibold text-orange-600 hover:text-orange-700 hover:underline inline-flex items-center gap-1.5 break-all"
                        >
                          <Mail size={15} />
                          {restaurant.owner.email}
                        </a>
                      ) : (
                        <p className="font-semibold text-gray-400">—</p>
                      )}
                    </div>
                    <div>
                      <p className="text-gray-600">Cuisines</p>
                      <p className="font-semibold">{restaurant.cuisine?.join(", ")}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Rating</p>
                      <p className="font-semibold">{restaurant.rating || "N/A"} ⭐</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Login Help</p>
                      {restaurant.owner ? (
                        <button
                          onClick={() => resetOwnerPassword(restaurant)}
                          className="mt-1 px-3 py-1.5 text-sm rounded font-semibold border border-gray-300 text-gray-700 hover:border-orange-600 hover:text-orange-600"
                          title="Set a new password for the owner (existing passwords cannot be viewed)"
                        >
                          Reset Password
                        </button>
                      ) : (
                        <p className="text-gray-400 text-sm">—</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <button
                      onClick={() =>
                        editingAddrId === restaurant._id ? cancelEditAddress() : startEditAddress(restaurant)
                      }
                      className="px-4 py-2 rounded font-semibold border border-gray-300 text-gray-700 hover:border-orange-600"
                    >
                      {editingAddrId === restaurant._id ? "Close Editor" : "Edit Address"}
                    </button>
                    {restaurant.status === "pending" && (
                      <>
                        <button
                          onClick={() => handleApprove(restaurant._id)}
                          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 font-semibold"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(restaurant._id)}
                          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 font-semibold"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {restaurant.status === "approved" && (
                      <button
                        onClick={() => toggleActive(restaurant)}
                        className={`px-4 py-2 rounded font-semibold border-2 ${
                          restaurant.isActive === false
                            ? "border-green-200 text-green-700 hover:bg-green-50"
                            : "border-orange-200 text-orange-600 hover:bg-orange-50"
                        }`}
                      >
                        {restaurant.isActive === false ? "Activate" : "Suspend"}
                      </button>
                    )}
                    {restaurant.isActive === false && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-bold">SUSPENDED</span>
                    )}
                  </div>

                  {editingAddrId === restaurant._id && (
                    <div className="mt-4 bg-orange-50 border border-orange-100 rounded-lg p-4">
                      <p className="text-sm font-semibold text-gray-700 mb-3">
                        Edit address for “{restaurant.name}” — changes go live in Discover instantly
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input
                          value={addrForm.location}
                          onChange={(e) => setAddrForm((p) => ({ ...p, location: e.target.value }))}
                          placeholder="Full street address"
                          className="px-3 py-2 border border-gray-300 rounded text-sm md:col-span-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                        <input
                          value={addrForm.city}
                          onChange={(e) => setAddrForm((p) => ({ ...p, city: e.target.value }))}
                          placeholder="City"
                          className="px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                        <p className="text-xs text-gray-500 self-center">
                          Coordinates power the nearby (5 km) search — right-click the spot in Google
                          Maps and copy the “lat, lng” pair.
                        </p>
                        <input
                          type="number"
                          step="any"
                          value={addrForm.latitude}
                          onChange={(e) => setAddrForm((p) => ({ ...p, latitude: e.target.value }))}
                          placeholder="Latitude (e.g. 19.0760)"
                          className="px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                        <input
                          type="number"
                          step="any"
                          value={addrForm.longitude}
                          onChange={(e) => setAddrForm((p) => ({ ...p, longitude: e.target.value }))}
                          placeholder="Longitude (e.g. 72.8777)"
                          className="px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                      <div className="flex gap-3 mt-4">
                        <button
                          onClick={() => saveAddress(restaurant._id)}
                          disabled={savingAddr}
                          className="bg-orange-600 text-white px-5 py-2 rounded font-semibold hover:bg-orange-700 disabled:opacity-60"
                        >
                          {savingAddr ? "Saving..." : "Save Address"}
                        </button>
                        <button
                          onClick={cancelEditAddress}
                          disabled={savingAddr}
                          className="bg-gray-200 text-gray-700 px-5 py-2 rounded font-semibold hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
