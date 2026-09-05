import "dotenv/config";
import mongoose from "mongoose";
import User from "./src/models/User.js";

const BASE = "http://127.0.0.1:4000/api";
const req = async (method, path, body, token) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
};

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  // Login owner + customer
  const ownerLogin = await req("POST", "/auth/login", { email: "owner@quickfood.com", password: "owner123456" });
  const custLogin = await req("POST", "/auth/login", { email: "customer@quickfood.com", password: "customer123456" });
  console.log("owner login:", ownerLogin.status, "| customer login:", custLogin.status);

  const ownerToken = ownerLogin.data.token;
  const custToken = custLogin.data.token;
  const custId = custLogin.data.user._id;

  // Owner's restaurant
  const mine = await req("GET", "/restaurants/owner/my-restaurant", null, ownerToken);
  const restId = mine.data.data._id;
  console.log("owner restaurant:", mine.data.data.name);

  // Menu item
  const menu = await req("GET", `/restaurants/${restId}/menu`);
  const item = menu.data.data[0];
  if (!item) { console.log("NO MENU ITEMS"); process.exit(1); }

  // 1. Create delivery order
  const order = await req("POST", "/orders", {
    items: [{ menuItem: item._id, quantity: 1 }],
    restaurant: restId,
    type: "delivery",
    deliveryAddress: { street: "456 Oak Avenue, Suburbs", city: "Mumbai", zip: "400050" },
    paymentMethod: "card",
  }, custToken);
  const orderId = order.data.data._id;
  console.log("\norder created:", order.status, order.data.data?.status, "| est delivery:", order.data.data?.estimatedDeliveryTime, "| partner:", order.data.data?.deliveryPartner);

  // 2. Owner accepts → confirmed
  const conf = await req("PATCH", `/orders/${orderId}/status`, { status: "confirmed" }, ownerToken);
  console.log("owner → confirmed:", conf.status);

  // 3. Owner → ready
  const ready = await req("PATCH", `/orders/${orderId}/status`, { status: "ready" }, ownerToken);
  console.log("owner → ready:", ready.status);

  // 4. Available for delivery partners?
  const avail = await req("GET", "/orders/delivery-partner/available", null, custToken);
  console.log("available (as normal customer):", avail.status, avail.data.count);

  // 5. Make customer a delivery partner (direct DB update — no UI flow exists)
  await User.updateOne({ _id: custId }, { isDeliveryPartner: true, isAvailable: true });
  const partnerLogin = await req("POST", "/auth/login", { email: "customer@quickfood.com", password: "customer123456" });
  const partnerToken = partnerLogin.data.token;
  console.log("partner login:", partnerLogin.status, "isDeliveryPartner:", partnerLogin.data.user?.isDeliveryPartner);

  // 6. Partner accepts → out_for_delivery
  const accept = await req("PATCH", `/orders/${orderId}/accept`, null, partnerToken);
  console.log("partner accept:", accept.status, "→", accept.data.data?.status);

  // 7. Partner shares location
  const loc = await req("PATCH", `/orders/${orderId}/location`, { lat: 19.05, lng: 72.87 }, partnerToken);
  console.log("partner share location:", loc.status, JSON.stringify(loc.data));

  // 8. Customer tracks the order
  const track = await req("GET", `/orders/${orderId}/track`, null, custToken);
  console.log("\n=== CUSTOMER TRACK RESPONSE ===");
  console.log("status:", track.status);
  console.log(JSON.stringify(track.data?.data, null, 2));

  // 9. Verify the map data
  const partnerLoc = track.data?.data?.deliveryPartner?.location;
  console.log("\nMap iframe coords ready:", partnerLoc?.lat != null && partnerLoc?.lng != null ? "YES ✓" : "NO ✗");

  await mongoose.disconnect();
  process.exit(0);
};
run().catch(async (e) => { console.error("CRASH:", e.message); await mongoose.disconnect(); process.exit(1); });