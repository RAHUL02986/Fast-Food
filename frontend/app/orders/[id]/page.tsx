"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { orderAPI } from "@/lib/api";
import Link from "next/link";
<<<<<<< HEAD
import { Bike } from "lucide-react";
=======
>>>>>>> 1ed4806eca017c48e5ffc19d534dbae1fea1c856
import { useAuth } from "@/lib/AuthContext";
import { CustomerNav } from "@/components/Navs";

export default function OrderDetailsPage() {
  const params = useParams();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");
  const [submitting, setSubmitting] = useState(false);
<<<<<<< HEAD
  const [track, setTrack] = useState<any>(null);
=======
>>>>>>> 1ed4806eca017c48e5ffc19d534dbae1fea1c856

  useEffect(() => {
    // Wait for AuthContext to finish verifying the token before redirecting —
    // otherwise a logged-in user gets bounced to /login on a hard page load
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const data = await orderAPI.getOrderById(params.id as string);
        setOrder(data.data);
        setError(null);
      } catch (error: any) {
        console.error("Error fetching order:", error);
        setError(error.message || "Failed to load order");
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchOrder();
  }, [params.id, user]);

<<<<<<< HEAD
  // Live tracking — poll every 5s while the order is out for delivery
  useEffect(() => {
    if (!order || order.status !== "out_for_delivery") return;
    if (!user) return;

    let cancelled = false;
    const fetchTrack = async () => {
      try {
        const data = await orderAPI.trackOrder(order._id);
        if (!cancelled) setTrack(data.data);
      } catch {
        /* transient — ignore */
      }
    };
    fetchTrack();
    const interval = setInterval(fetchTrack, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [order, user]);

=======
>>>>>>> 1ed4806eca017c48e5ffc19d534dbae1fea1c856
  const handleRateOrder = async () => {
    if (!order) return;

    setSubmitting(true);
    try {
      await orderAPI.rateOrder(order._id, {
        rating: parseInt(rating.toString()),
        review,
      });

      alert("Thank you for your rating!");
      setReview("");
      setRating(5);
      // Refresh order
      const data = await orderAPI.getOrderById(params.id as string);
      setOrder(data.data);
    } catch (error: any) {
      alert(error.message || "Error submitting rating");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading order details...</div>;
  }

  if (!order) {
    return (
      <div className="p-8 text-center">
        <p>{error || "Order not found"}</p>
        <Link href="/dashboard" className="text-orange-600 hover:underline mt-2 block">
          Back to Orders
        </Link>
      </div>
    );
  }

  const formatAddress = (address: any) => {
    if (!address) return "";
    if (typeof address === "string") return address;

    return [address.street, address.city, address.state, address.zip]
      .filter(Boolean)
      .join(", ");
  };

  const statusColors: any = {
    placed: "bg-blue-100 text-blue-800",
    confirmed: "bg-blue-100 text-blue-800",
    preparing: "bg-yellow-100 text-yellow-800",
    ready: "bg-purple-100 text-purple-800",
    out_for_delivery: "bg-orange-100 text-orange-800",
    delivered: "bg-green-100 text-green-800",
    served: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <CustomerNav />

      <div className="max-w-4xl mx-auto p-8">
        {/* Order Header */}
        <div className="bg-white p-8 rounded-lg shadow mb-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-gray-600 text-sm">Order Number</p>
              <h1 className="text-3xl font-bold">
                {order.orderNumber}
                {order.type === "dine-in" && (
                  <span className="ml-3 align-middle text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-bold">
                    Dine-in · Table {order.table?.name || ""}
                  </span>
                )}
              </h1>
            </div>
            <span className={`px-4 py-2 rounded font-semibold ${statusColors[order.status] || "bg-gray-100"}`}>
              {order.status.replace("_", " ").toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-6 mb-6">
            <div>
              <p className="text-gray-600 text-sm">Restaurant</p>
              <p className="font-semibold">{order.restaurant?.name}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Order Date</p>
              <p className="font-semibold">{new Date(order.createdAt).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-gray-600 text-sm">Estimated Delivery</p>
              <p className="font-semibold">
                {order.estimatedDeliveryTime
                  ? new Date(order.estimatedDeliveryTime).toLocaleTimeString()
                  : "Pending"}
              </p>
            </div>
          </div>

          {order.deliveryAddress && (
            <div className="bg-gray-50 p-4 rounded">
              <p className="text-gray-600 text-sm">Delivery Address</p>
              <p className="font-semibold">{formatAddress(order.deliveryAddress)}</p>
            </div>
          )}
        </div>

<<<<<<< HEAD
        {/* Live Tracking — shown while out for delivery */}
        {order.status === "out_for_delivery" && (
          <div className="bg-white p-8 rounded-lg shadow mb-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Bike className="text-orange-600" /> Live Delivery Tracking
            </h2>

            {track?.deliveryPartner ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-4 bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-600 text-white">
                    <Bike size={20} />
                  </span>
                  <div>
                    <p className="font-semibold">{track.deliveryPartner.name || "Delivery Partner"}</p>
                    <p className="text-sm text-gray-600">
                      On the way to you! {track.deliveryPartner.phone ? `· ${track.deliveryPartner.phone}` : ""}
                    </p>
                  </div>
                </div>

                {track.deliveryPartner.location?.lat != null &&
                track.deliveryPartner.location?.lng != null ? (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">
                      📍 Live location (auto-refreshes every 5 seconds) —{" "}
                      {track.deliveryPartner.location.lat.toFixed(5)},{" "}
                      {track.deliveryPartner.location.lng.toFixed(5)}
                    </p>
                    <iframe
                      title="Live delivery location"
                      width="100%"
                      height="320"
                      loading="lazy"
                      className="rounded-lg border border-gray-200"
                      src={`https://maps.google.com/maps?q=${track.deliveryPartner.location.lat},${track.deliveryPartner.location.lng}&z=15&output=embed`}
                    />
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    <p>Delivery partner assigned — waiting for them to share their live location.</p>
                    <p className="text-sm">Keep this page open — it updates automatically.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <p>Your order is out for delivery. Waiting for a delivery partner to accept it…</p>
                <p className="text-sm">
                  Once a partner is assigned and shares their location, the live map will appear here.
                </p>
              </div>
            )}
          </div>
        )}

=======
>>>>>>> 1ed4806eca017c48e5ffc19d534dbae1fea1c856
        {/* Order Items */}
        <div className="bg-white p-8 rounded-lg shadow mb-6">
          <h2 className="text-xl font-bold mb-4">Order Items</h2>
          <div className="divide-y">
            {order.items.map((item: any, index: number) => (
              <div key={index} className="py-4 flex justify-between">
                <div>
                  <p className="font-semibold">{item.menuItem?.name || "Unknown Item"}</p>
                  {item.instructions && <p className="text-gray-600 text-sm">Note: {item.instructions}</p>}
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">
                    {item.quantity} × ₹{item.price}
                  </p>
                  <p className="font-semibold">₹{item.quantity * item.price}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-white p-8 rounded-lg shadow mb-6">
          <h2 className="text-xl font-bold mb-4">Order Summary</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-semibold">₹{order.subtotal}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Tax (5%)</span>
              <span className="font-semibold">₹{order.tax}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Delivery Charge</span>
              <span className="font-semibold">₹{order.deliveryCharge}</span>
            </div>
            <div className="border-t pt-3 flex justify-between text-lg">
              <span className="font-bold">Total</span>
              <span className="font-bold text-orange-600">₹{order.total}</span>
            </div>
          </div>
        </div>

        {/* Status Timeline */}
        {order.statusUpdates && order.statusUpdates.length > 0 && (
          <div className="bg-white p-8 rounded-lg shadow mb-6">
            <h2 className="text-xl font-bold mb-4">Order Timeline</h2>
            <div className="space-y-3">
              {order.statusUpdates.map((update: any, index: number) => (
                <div key={index} className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-orange-600 text-white text-sm font-bold">
                      ✓
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold capitalize">{update.status.replace("_", " ")}</p>
                    <p className="text-gray-600 text-sm">
<<<<<<< HEAD
                      {update.timestamp ? new Date(update.timestamp).toLocaleString() : "Pending"}
=======
                      {new Date(update.updatedAt).toLocaleString()}
>>>>>>> 1ed4806eca017c48e5ffc19d534dbae1fea1c856
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rating Section (for delivered orders) */}
        {order.status === "delivered" && !order.rating && (
          <div className="bg-white p-8 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-6">Rate Your Order</h2>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">Rating</label>
              <div className="flex gap-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className={`text-3xl transition ${rating >= star ? "text-yellow-500" : "text-gray-300"}`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Your Review</label>
              <textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                placeholder="Share your experience..."
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <button
              onClick={handleRateOrder}
              disabled={submitting}
              className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white font-bold py-2 px-6 rounded-lg transition"
            >
              {submitting ? "Submitting..." : "Submit Rating"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
