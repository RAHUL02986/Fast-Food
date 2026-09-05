"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { restaurantAPI, analyticsAPI, adminAPI } from "@/lib/api";
import { AdminNav } from "@/components/Navs";

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [dashboard, setDashboard] = useState<any>(null);
  const [pendingRestaurants, setPendingRestaurants] = useState<any[]>([]);
  const [inviteCode, setInviteCode] = useState<string>("");
  const [inviteExpiresAt, setInviteExpiresAt] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [inviteLoading, setInviteLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "admin")) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashboardData, restaurantsData] = await Promise.all([
          analyticsAPI.getAdminDashboard(),
          restaurantAPI.getPendingRestaurants(),
        ]);

        setDashboard(dashboardData.data);
        setPendingRestaurants(restaurantsData.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) fetchData();
  }, [authLoading]);

  const handleGenerateInvite = async () => {
    try {
      setInviteLoading(true);
      const response = await adminAPI.generateInvite();
      setInviteCode(response.data.code);
      setInviteExpiresAt(response.data.expiresAt);
    } catch (error: any) {
      alert(error.message || "Unable to generate invite code");
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCopyInvite = async () => {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      alert("Invite code copied to clipboard");
    } catch (error) {
      alert("Copy failed. Please copy the code manually.");
    }
  };

  const handleApprove = async (restaurantId: string) => {
    try {
      await restaurantAPI.approveRestaurant(restaurantId);
      setPendingRestaurants((prev) => prev.filter((r) => r._id !== restaurantId));
      alert("Restaurant approved successfully");
    } catch (error) {
      alert("Error approving restaurant");
    }
  };

  const handleReject = async (restaurantId: string) => {
    const reason = prompt("Enter rejection reason:");
    if (reason) {
      try {
        await restaurantAPI.rejectRestaurant(restaurantId, { reason });
        setPendingRestaurants((prev) => prev.filter((r) => r._id !== restaurantId));
        alert("Restaurant rejected");
      } catch (error) {
        alert("Error rejecting restaurant");
      }
    }
  };

  if (authLoading || loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />

      <div className="max-w-7xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>

        <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-wide text-orange-100">Super Admin Access</p>
              <h2 className="text-2xl font-bold mt-1">Create a new admin invite</h2>
              <p className="text-orange-50 mt-2">
                Generate a secure one-time code to invite a new admin to join the platform.
              </p>
            </div>

            <button
              onClick={handleGenerateInvite}
              disabled={inviteLoading}
              className="bg-white text-orange-600 font-semibold px-5 py-3 rounded-lg hover:bg-orange-50 disabled:opacity-60"
            >
              {inviteLoading ? "Generating..." : "Generate Invite"}
            </button>
          </div>

          {inviteCode && (
            <div className="mt-5 rounded-xl bg-white/10 border border-white/20 p-4 backdrop-blur-sm">
              <p className="text-sm text-orange-100 mb-2">Share this code with the new admin:</p>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="bg-white text-gray-900 font-bold text-xl tracking-[0.2em] px-4 py-3 rounded-lg flex-1 text-center sm:text-left">
                  {inviteCode}
                </div>
                <button
                  onClick={handleCopyInvite}
                  className="bg-black/10 border border-white/20 text-white px-4 py-3 rounded-lg hover:bg-black/20"
                >
                  Copy Code
                </button>
              </div>
              <p className="text-sm text-orange-100 mt-3">
                Valid until {new Date(inviteExpiresAt).toLocaleString()}
              </p>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-600 text-sm font-semibold mb-2">Total Orders</h3>
            <p className="text-3xl font-bold">{dashboard?.stats?.totalOrders || 0}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-600 text-sm font-semibold mb-2">Total Bookings</h3>
            <p className="text-3xl font-bold">{dashboard?.stats?.totalBookings || 0}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-600 text-sm font-semibold mb-2">Restaurants</h3>
            <p className="text-3xl font-bold">{dashboard?.stats?.totalRestaurants || 0}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-600 text-sm font-semibold mb-2">Revenue</h3>
            <p className="text-3xl font-bold">₹{dashboard?.stats?.totalRevenue || 0}</p>
          </div>
        </div>

        {/* Pending Restaurants */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="p-6 border-b">
            <h3 className="text-xl font-bold">Pending Restaurant Approvals</h3>
          </div>
          <div className="divide-y">
            {pendingRestaurants.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No pending restaurants</div>
            ) : (
              pendingRestaurants.map((restaurant: any) => (
                <div key={restaurant._id} className="p-6 flex justify-between items-center">
                  <div>
                    <p className="font-bold">{restaurant.name}</p>
                    <p className="text-gray-600">{restaurant.cuisine?.join(", ")} • {restaurant.location}</p>
                    <p className="text-sm text-gray-500">Owner: {restaurant.owner?.name} ({restaurant.owner?.email})</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(restaurant._id)}
                      className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(restaurant._id)}
                      className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
