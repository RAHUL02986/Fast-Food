"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { restaurantAPI, orderAPI, menuAPI, uploadAPI } from "@/lib/api";
import { OwnerNav } from "@/components/Navs";
import Link from "next/link";

export default function OwnerDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, pending: 0, preparing: 0 });
  const [banner, setBanner] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [savingPhotos, setSavingPhotos] = useState(false);
<<<<<<< HEAD
  const [addr, setAddr] = useState({ location: "", city: "", latitude: "", longitude: "" });
  const [savingAddr, setSavingAddr] = useState(false);
=======
>>>>>>> 1ed4806eca017c48e5ffc19d534dbae1fea1c856

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "owner")) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const restaurantData = await restaurantAPI.getOwnerRestaurant();

        setRestaurant(restaurantData.data);
        setBanner(restaurantData.data?.banner || "");
        setPhotos(restaurantData.data?.photos || []);
<<<<<<< HEAD
        setAddr({
          location: restaurantData.data?.location || "",
          city: restaurantData.data?.city || "",
          latitude: restaurantData.data?.latitude?.toString() ?? "",
          longitude: restaurantData.data?.longitude?.toString() ?? "",
        });
=======
>>>>>>> 1ed4806eca017c48e5ffc19d534dbae1fea1c856

        if (restaurantData.data) {
          const restaurantOrders = await orderAPI.getOrders({ restaurantId: restaurantData.data._id });
          setOrders(restaurantOrders.data);

          // Calculate stats
          setStats({
            total: restaurantOrders.data.length,
            pending: restaurantOrders.data.filter((o: any) => o.status === "placed").length,
            preparing: restaurantOrders.data.filter((o: any) => o.status === "preparing").length,
          });
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) fetchData();
  }, [authLoading]);

  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>, target: "banner" | "gallery") => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file (JPG, PNG, WebP or GIF)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Image too large (max 5 MB)");
      return;
    }
    try {
      setUploadingPhoto(true);
      const { url } = await uploadAPI.uploadImage(file);
      if (target === "banner") {
        setBanner(url);
      } else {
        setPhotos((prev) => [...prev, url]);
      }
    } catch (error: any) {
      alert(error.message || "Error uploading image");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const savePhotos = async () => {
    try {
      setSavingPhotos(true);
      const res = await restaurantAPI.updateRestaurant(restaurant._id, { banner, photos });
      setRestaurant(res.data);
      setBanner(res.data.banner || "");
      setPhotos(res.data.photos || []);
      alert("Photos saved successfully!");
    } catch (error: any) {
      alert(error.message || "Error saving photos");
    } finally {
      setSavingPhotos(false);
    }
  };

<<<<<<< HEAD
  const saveAddress = async () => {
    if ((addr.latitude === "") !== (addr.longitude === "")) {
      alert("Please provide both latitude and longitude together (or leave both empty).");
      return;
    }
    const payload: any = { location: addr.location.trim(), city: addr.city.trim() };
    if (addr.latitude !== "") {
      payload.latitude = parseFloat(addr.latitude);
      payload.longitude = parseFloat(addr.longitude);
      if (Number.isNaN(payload.latitude) || Number.isNaN(payload.longitude)) {
        alert("Latitude and longitude must be numbers (e.g. 19.0760 / 72.8777).");
        return;
      }
    }
    try {
      setSavingAddr(true);
      const res = await restaurantAPI.updateRestaurant(restaurant._id, payload);
      setRestaurant(res.data);
      setAddr({
        location: res.data.location || "",
        city: res.data.city || "",
        latitude: res.data.latitude?.toString() ?? "",
        longitude: res.data.longitude?.toString() ?? "",
      });
      alert("Address saved successfully!");
    } catch (error: any) {
      alert(error.message || "Error saving address");
    } finally {
      setSavingAddr(false);
    }
  };

=======
>>>>>>> 1ed4806eca017c48e5ffc19d534dbae1fea1c856
  if (authLoading || loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <OwnerNav />

      <div className="max-w-7xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-8">Restaurant Dashboard</h1>

        {!restaurant ? (
          <div className="bg-white p-8 rounded-lg shadow">
            <p className="text-gray-600 mb-4">You haven't registered a restaurant yet.</p>
            <Link href="/owner/register-restaurant" className="bg-orange-600 text-white px-6 py-2 rounded">
              Register Restaurant
            </Link>
          </div>
        ) : (
          <>
            {/* Restaurant Info */}
            <div className="bg-white p-8 rounded-lg shadow mb-8">
              <h2 className="text-2xl font-bold mb-4">{restaurant.name}</h2>
              <p className="text-gray-600">Status: <span className="font-bold text-orange-600">{restaurant.status}</span></p>
              {restaurant.status === "pending" && <p className="text-yellow-600 mt-2">⏳ Awaiting admin approval</p>}
              {restaurant.status === "approved" && <p className="text-green-600 mt-2">✓ Live and accepting orders</p>}
            </div>

<<<<<<< HEAD
            {/* Restaurant Address Editor */}
            <div className="bg-white p-8 rounded-lg shadow mb-8">
              <h2 className="text-2xl font-bold mb-2">Restaurant Address</h2>
              <p className="text-sm text-gray-500 mb-6">
                Customers find you by this address, and the coordinates power the nearby
                (&ldquo;Use my location&rdquo;, 5 km radius) search. Tip: in Google Maps, right-click
                your exact spot and copy the &ldquo;latitude, longitude&rdquo; pair.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Street Address</label>
                  <input
                    type="text"
                    value={addr.location}
                    onChange={(e) => setAddr((p) => ({ ...p, location: e.target.value }))}
                    placeholder="Full street address"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">City</label>
                  <input
                    type="text"
                    value={addr.city}
                    onChange={(e) => setAddr((p) => ({ ...p, city: e.target.value }))}
                    placeholder="City"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div className="flex items-end">
                  <p className="text-xs text-gray-500">
                    Current map point:{" "}
                    {restaurant.latitude != null && restaurant.longitude != null
                      ? `${restaurant.latitude}, ${restaurant.longitude}`
                      : "not set — nearby search stays disabled until coordinates are saved"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={addr.latitude}
                    onChange={(e) => setAddr((p) => ({ ...p, latitude: e.target.value }))}
                    placeholder="e.g. 19.0760"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={addr.longitude}
                    onChange={(e) => setAddr((p) => ({ ...p, longitude: e.target.value }))}
                    placeholder="e.g. 72.8777"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={saveAddress}
                  disabled={savingAddr}
                  className="bg-orange-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-orange-700 disabled:opacity-60"
                >
                  {savingAddr ? "Saving..." : "Save Address"}
                </button>
                <button
                  onClick={() =>
                    setAddr({
                      location: restaurant.location || "",
                      city: restaurant.city || "",
                      latitude: restaurant.latitude?.toString() ?? "",
                      longitude: restaurant.longitude?.toString() ?? "",
                    })
                  }
                  disabled={savingAddr}
                  className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-semibold hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>

=======
>>>>>>> 1ed4806eca017c48e5ffc19d534dbae1fea1c856
            {/* Restaurant Photos */}
            <div className="bg-white p-8 rounded-lg shadow mb-8">
              <h2 className="text-2xl font-bold mb-6">Restaurant Photos</h2>

              {/* Banner */}
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-gray-600 mb-2">Banner Image</h3>
                <div className="flex items-center gap-4">
                  {banner && (
                    <div className="relative">
                      <img src={banner} alt="Restaurant banner" className="w-48 h-24 object-cover rounded-lg border" />
                      <button
                        onClick={() => setBanner("")}
                        className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 text-sm leading-none hover:bg-red-700"
                        title="Remove banner"
                      >
                        ×
                      </button>
                    </div>
                  )}
                  <label
                    className={`cursor-pointer bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-600 hover:border-orange-500 hover:text-orange-600 ${uploadingPhoto ? "opacity-60 pointer-events-none" : ""}`}
                  >
                    {uploadingPhoto ? "Uploading..." : banner ? "Change banner" : "📷 Upload banner"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={(e) => uploadFile(e, "banner")}
                      className="hidden"
                      disabled={uploadingPhoto}
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1">Shown as the restaurant cover image</p>
              </div>

              {/* Photo Gallery */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-600 mb-2">Photo Gallery</h3>
                {photos.length > 0 && (
                  <div className="flex flex-wrap gap-3 mb-4">
                    {photos.map((photo, index) => (
                      <div key={index} className="relative">
                        <img src={photo} alt={`Restaurant photo ${index + 1}`} className="w-24 h-24 object-cover rounded-lg border" />
                        <button
                          onClick={() => setPhotos((prev) => prev.filter((_, i) => i !== index))}
                          className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 text-sm leading-none hover:bg-red-700"
                          title="Remove photo"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <label
                  className={`inline-block cursor-pointer bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-600 hover:border-orange-500 hover:text-orange-600 ${uploadingPhoto ? "opacity-60 pointer-events-none" : ""}`}
                >
                  {uploadingPhoto ? "Uploading..." : "📷 Add photo"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={(e) => uploadFile(e, "gallery")}
                    className="hidden"
                    disabled={uploadingPhoto}
                  />
                </label>
                <p className="text-xs text-gray-500 mt-1">JPG, PNG, WebP or GIF — max 5 MB each</p>
              </div>

              {(banner !== (restaurant.banner || "") || photos.length !== (restaurant.photos || []).length || photos.some((p, i) => p !== (restaurant.photos || [])[i])) && (
                <div className="flex gap-3 pt-4 border-t">
                  <button
                    onClick={savePhotos}
                    disabled={savingPhotos}
                    className="bg-orange-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-orange-700 disabled:opacity-60"
                  >
                    {savingPhotos ? "Saving..." : "Save Photos"}
                  </button>
                  <button
                    onClick={() => {
                      setBanner(restaurant.banner || "");
                      setPhotos(restaurant.photos || []);
                    }}
                    disabled={savingPhotos}
                    className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-semibold hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-gray-600 text-sm font-semibold mb-2">Total Orders</h3>
                <p className="text-3xl font-bold">{stats.total}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-gray-600 text-sm font-semibold mb-2">Pending Orders</h3>
                <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-gray-600 text-sm font-semibold mb-2">Preparing</h3>
                <p className="text-3xl font-bold text-blue-600">{stats.preparing}</p>
              </div>
            </div>

            {/* Orders */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <h3 className="text-xl font-bold">Recent Orders</h3>
              </div>
              <div className="divide-y">
                {orders.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">No orders yet</div>
                ) : (
                  orders.slice(0, 5).map((order: any) => (
                    <div key={order._id} className="p-6 flex justify-between items-center">
                      <div>
                        <p className="font-bold">{order.orderNumber}</p>
                        <p className="text-gray-600">{order.items.length} items • ₹{order.total}</p>
                      </div>
                      <div className="flex gap-2">
                        <span className={`px-3 py-1 rounded text-sm font-semibold ${order.status === "delivered" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                          {order.status}
                        </span>
                        <Link href={`/owner/orders/${order._id}`} className="text-orange-600 hover:underline">
                          View
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
