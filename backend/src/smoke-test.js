// End-to-end smoke test for the Quick Food API (dev only)
// Run against a different server with:  SMOKE_BASE_URL=http://localhost:4100/api node src/smoke-test.js
const BASE = process.env.SMOKE_BASE_URL || "http://localhost:4000/api";
let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  \u2713 ${name}`); }
  else { fail++; console.log(`  \u2717 ${name} ${extra}`); }
};

const req = async (method, path, body, token) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
};

const run = async () => {
  console.log("— Auth —");
  const adminLogin = await req("POST", "/auth/login", { email: "admin@quickfood.com", password: "admin123456" });
  ok("admin login", adminLogin.status === 200 && adminLogin.data.user.role === "admin");
  const ownerLogin = await req("POST", "/auth/login", { email: "owner@quickfood.com", password: "owner123456" });
  ok("owner login (email)", ownerLogin.status === 200);
  const ownerByPhone = await req("POST", "/auth/login", { email: "9898989898", password: "owner123456" });
  ok("owner login (phone identifier)", ownerByPhone.status === 200);
  const custLogin = await req("POST", "/auth/login", { email: "customer@quickfood.com", password: "customer123456" });
  ok("customer login", custLogin.status === 200);
  const adminToken = adminLogin.data.token, ownerToken = ownerLogin.data.token, custToken = custLogin.data.token;

  const otpReq = await req("POST", "/auth/otp/request", { identifier: "9988776655" });
  ok("OTP request returns code", otpReq.status === 200 && /^\d{6}$/.test(otpReq.data.otp || ""));
  const badOtp = await req("POST", "/auth/otp/verify", { identifier: "9988776655", otp: "000000" });
  ok("wrong OTP rejected", badOtp.status === 401);
  const otpVerify = await req("POST", "/auth/otp/verify", { identifier: "9988776655", otp: otpReq.data.otp });
  ok("OTP verify issues JWT", otpVerify.status === 200 && !!otpVerify.data.token);
  const otpNoUser = await req("POST", "/auth/otp/request", { identifier: "nobody@x.com" });
  ok("OTP for unknown user → 404", otpNoUser.status === 404);

  console.log("— Delivery order flow —");
  const rests = await req("GET", "/restaurants");
  const greenFork = rests.data.data.find((r) => r.name === "The Green Fork");
  ok("public browse lists approved restaurants", rests.status === 200 && !!greenFork);
  const menu = await req("GET", `/restaurants/${greenFork._id}/menu`);
  ok("menu items", menu.status === 200 && menu.data.data.length > 0);
  const cust = await req("GET", "/auth/profile", null, custToken);
  ok("customer profile has saved addresses", (cust.data.addresses || []).length >= 2);

  const item = menu.data.data[0];
  const newOrder = await req("POST", "/orders", {
    items: [{ menuItem: item._id, quantity: 2 }],
    restaurant: greenFork._id,
    type: "delivery",
    deliveryAddress: { street: "456 Oak Avenue, Suburbs", city: "Mumbai", zip: "400050" },
    paymentMethod: "card",
  }, custToken);
  ok("customer places delivery order", newOrder.status === 201 && newOrder.data.data.type === "delivery");
  const deliveryTotal = newOrder.data.data.total;
  ok("server-computed total = subtotal + delivery + 5% tax",
    deliveryTotal === item.price * 2 + Math.round(item.price * 2 * 0.05) + (greenFork.deliveryCharge || 40));

  console.log("— Owner order management —");
  const summary = await req("GET", "/orders/daily-summary", null, ownerToken);
  ok("owner daily summary", summary.status === 200 && summary.data.data.ordersToday >= 1);
  const adminSummary = await req("GET", "/orders/daily-summary", null, adminToken);
  ok("admin denied owner daily summary", adminSummary.status === 403);
  const accept = await req("PATCH", `/orders/${newOrder.data.data._id}/status`, { status: "confirmed" }, ownerToken);
  ok("owner accepts order", accept.status === 200);
  const adminStatus = await req("PATCH", `/orders/${newOrder.data.data._id}/status`, { status: "delivered" }, adminToken);
  ok("admin CANNOT update order status (spec)", adminStatus.status === 403);
  const reject = await req("PATCH", `/orders/${newOrder.data.data._id}/reject`, { reason: "Kitchen closed" }, ownerToken);
  ok("owner rejects order", reject.status === 200 && reject.data.data.status === "cancelled");

  console.log("— Booking + reschedule —");
  const today = new Date().toISOString().slice(0, 10);
  // Fresh dedicated slots with generous capacity → the suite stays idempotent
  // even after many runs (shared seeded slots fill up over time).
  const freshSlots = await req("POST", "/slots", {
    date: today,
    slots: [
      { startTime: "15:00", endTime: "16:00", capacity: 8 },
      { startTime: "16:00", endTime: "17:00", capacity: 8 },
    ],
  }, ownerToken);
  ok("owner creates test slots", freshSlots.status === 201 && freshSlots.data.data.length === 2);
  const slotA = freshSlots.data.data[0], slotB = freshSlots.data.data[1];
  const slots = await req("GET", `/bookings/available-slots?restaurantId=${greenFork._id}&date=${today}`);
  ok("available slots", slots.status === 200 && slots.data.data.some((s) => s._id === slotA._id));
  const booking = await req("POST", "/bookings", { slot: slotA._id, partySize: 2, advancePaymentMethod: "upi" }, custToken);
  ok("booking created with bookingCode", booking.status === 201 && !!booking.data.data.bookingCode && !!booking.data.data.table);
  ok("advance = ₹200 base for 2 guests, marked paid",
    booking.status === 201 && booking.data.data.advanceAmount === 200 && booking.data.data.advanceStatus === "paid");
  const tooSmall = await req("POST", "/bookings", { slot: slotA._id, partySize: 1 }, custToken);
  ok("1-guest booking rejected (min 2)", tooSmall.status === 400);
  const party4 = await req("POST", "/bookings", { slot: slotB._id, partySize: 4, advancePaymentMethod: "card" }, custToken);
  ok("advance for 4 guests = ₹200 + 2×₹50 = ₹300", party4.status === 201 && party4.data.data?.advanceAmount === 300);
  if (party4.status === 201) {
    const cancelAdv = await req("PATCH", `/bookings/${party4.data.data._id}/cancel`, { reason: "plans changed" }, custToken);
    ok("cancelled booking refunds 50% of advance (₹150 of ₹300)",
      cancelAdv.status === 200 && cancelAdv.data.data.advanceStatus === "refunded" && cancelAdv.data.data.refundAmount === 150);
  }
  const resched = await req("PATCH", `/bookings/${booking.data.data._id}/reschedule`, { slot: slotB._id }, custToken);
  ok("booking rescheduled", resched.status === 200 && resched.data.data.slot._id === slotB._id);
  // Cleanup: cancel the remaining test booking so the dedicated slots can be deleted
  const cancelTest = await req("PATCH", `/bookings/${booking.data.data._id}/cancel`, { reason: "smoke test cleanup" }, custToken);
  ok("test booking cancelled (cleanup)", cancelTest.status === 200);
  const delSlotA = await req("DELETE", `/slots/${slotA._id}`, null, ownerToken);
  const delSlotB = await req("DELETE", `/slots/${slotB._id}`, null, ownerToken);
  ok("test slots cleaned up", delSlotA.status === 200 && delSlotB.status === 200);
  console.log("— Table QR / dine-in flow —");
  const tables = await req("GET", "/tables", null, ownerToken);
  ok("owner lists own tables", tables.status === 200 && tables.data.data.length >= 4);
  const qrCode = tables.data.data[0].qrCode;
  const resolved = await req("GET", `/tables/qr/${qrCode}`);
  ok("table QR resolves publicly", resolved.status === 200 && resolved.data.data.restaurant.name);
  const tableId = resolved.data.data.table._id;
  const dineIn = await req("POST", "/orders", {
    items: [{ menuItem: item._id, quantity: 1 }],
    restaurant: resolved.data.data.restaurant._id,
    type: "dine-in",
    table: tableId,
    paymentMethod: "cash",
  }, custToken);
  ok("dine-in order placed from table", dineIn.status === 201 && dineIn.data.data.type === "dine-in");
  ok("dine-in has no delivery charge", dineIn.data.data.deliveryCharge === 0);
  const tableOrders = await req("GET", `/tables/${tableId}/orders`);
  ok("table live orders visible", tableOrders.status === 200 && tableOrders.data.data.length >= 1);
  ok("table orders include item names",
    !!tableOrders.data.data[0]?.items?.[0]?.menuItem?.name);
  const prep = await req("PATCH", `/orders/${dineIn.data.data._id}/status`, { status: "preparing" }, ownerToken);
  ok("owner moves dine-in → preparing (table occupied)", prep.status === 200);
  const served = await req("PATCH", `/orders/${dineIn.data.data._id}/status`, { status: "served" }, ownerToken);
  ok("owner moves dine-in → served", served.status === 200 && served.data.data.paymentStatus === "completed");
  const tableAfter = await req("GET", `/tables/qr/${qrCode}`);
  ok("table back to free after served", tableAfter.data.data.table.status === "free");

  console.log("— Owner table & slot management —");
  const newTable = await req("POST", "/tables", { name: "T9", capacity: 8 }, ownerToken);
  ok("owner creates table with QR", newTable.status === 201 && !!newTable.data.data.qrCode);
  const occ = await req("PATCH", `/tables/${newTable.data.data._id}/status`, { status: "occupied" }, ownerToken);
  ok("owner marks table occupied", occ.status === 200 && occ.data.data.status === "occupied");
  const adminTable = await req("POST", "/tables", { name: "AX", capacity: 2 }, adminToken);
  ok("admin CANNOT create tables", adminTable.status === 403);
  const newSlots = await req("POST", "/slots", { date: today, slots: [{ startTime: "21:00", endTime: "22:00", capacity: 4 }] }, ownerToken);
  ok("owner creates slots", newSlots.status === 201 && newSlots.data.data.length === 1);
  const delSlot = await req("DELETE", `/slots/${newSlots.data.data[0]._id}`, null, ownerToken);
  ok("owner deletes slot", delSlot.status === 200);
  const delTable = await req("DELETE", `/tables/${newTable.data.data._id}`, null, ownerToken);
  ok("owner deletes table", delTable.status === 200);

  console.log("— Admin moderation —");
  const customers = await req("GET", "/admin/customers", null, adminToken);
  ok("admin lists customers (no passwords)", customers.status === 200 && customers.data.data.every((c) => !c.password));
  const victim = customers.data.data.find((c) => c.email === "customer@quickfood.com") || customers.data.data[0];
  const suspend = await req("PATCH", `/admin/customers/${victim._id}/active`, { isActive: false }, adminToken);
  ok("admin suspends customer", suspend.status === 200 && suspend.data.data.isActive === false);
  const suspendedLogin = await req("POST", "/auth/login", { email: victim.email, password: "customer123456" });
  ok("suspended customer cannot log in", suspendedLogin.status === 403);
  const reactivate = await req("PATCH", `/admin/customers/${victim._id}/active`, { isActive: true }, adminToken);
  ok("admin reactivates customer", reactivate.status === 200);
  const adminBookings = await req("GET", "/admin/bookings", null, adminToken);
  ok("admin views all bookings (read-only)", adminBookings.status === 200);
  const reports = await req("GET", "/admin/reports", null, adminToken);
  ok("admin views reports", reports.status === 200 && reports.data.data.length >= 1);
  const reportUpdate = await req("PATCH", `/admin/reports/${reports.data.data[0]._id}`, { status: "reviewing" }, adminToken);
  ok("admin updates report status", reportUpdate.status === 200);
  const custReport = await req("POST", "/admin/reports", { category: "delivery", subject: "Late delivery", description: "Arrived 40 min late." }, custToken);
  ok("customer files report", custReport.status === 201);
  const ownerReports = await req("GET", "/admin/reports", null, ownerToken);
  ok("owner denied admin reports", ownerReports.status === 403);

  console.log("— Admin invite & super admin signup —");
  const genInvite = await req("POST", "/admin/invites/generate", null, adminToken);
  ok("admin generates invite code", genInvite.status === 201 && /^[A-Z0-9-]+$/.test(genInvite.data?.data?.code || ""));
  const generatedCode = genInvite.data?.data?.code;

  // Unique emails so the smoke test is re-runnable against a non-fresh DB
  const uniq = Date.now();

  const superAdminSignup = await req("POST", "/auth/signup", {
    name: "Super Admin Two",
    email: `superadmin2-${uniq}@quickfood.com`,
    password: "superadmin123456",
    role: "admin",
    invitationCode: generatedCode,
  });
  ok("super admin signup with invite code succeeds", superAdminSignup.status === 201 && superAdminSignup.data?.user?.role === "admin", JSON.stringify(superAdminSignup.data));

  // Reusing the same invite code should fail (invite is single-use)
  const reusedSignup = await req("POST", "/auth/signup", {
    name: "Super Admin Three",
    email: `superadmin3-${uniq}@quickfood.com`,
    password: "superadmin123456",
    role: "admin",
    invitationCode: generatedCode,
  });
  ok("reused invite code rejected", reusedSignup.status === 400 && /invalid invitation code/i.test(reusedSignup.data?.message || ""));

  // Without an invite code, admin signup must fail
  const noCodeSignup = await req("POST", "/auth/signup", {
    name: "No Code Admin",
    email: `nocodeadmin-${uniq}@quickfood.com`,
    password: "nocode123456",
    role: "admin",
  });
  ok("admin signup without invite code rejected", noCodeSignup.status === 400 && /invalid invitation code/i.test(noCodeSignup.data?.message || ""));

  console.log("— Nearby restaurants (5km radius) —");
  // Green Fork is seeded at 19.076, 72.8777; Miso & More ~15km away at 18.944, 72.823
  const nearbyTight = await req("GET", "/restaurants/nearby?lat=19.076&lng=72.8777&radius=5");
  ok("nearby search returns 200 with distanceKm",
    nearbyTight.status === 200 && nearbyTight.data.data.every((r) => typeof r.distanceKm === "number"));
  const tightNames = nearbyTight.data.data.map((r) => r.name);
  ok("Green Fork found within 5km of its own coordinates", tightNames.includes("The Green Fork"));
  ok("restaurant ~15km away excluded from 5km radius", !tightNames.includes("Miso & More"));
  ok("all 5km results report distance ≤ 5", nearbyTight.data.data.every((r) => r.distanceKm <= 5));
  const nearbyWide = await req("GET", "/restaurants/nearby?lat=19.076&lng=72.8777&radius=20");
  const wideNames = nearbyWide.data.data.map((r) => r.name);
  ok("20km radius includes both seeded restaurants",
    wideNames.includes("The Green Fork") && wideNames.includes("Miso & More"));
  const wideDists = nearbyWide.data.data.map((r) => r.distanceKm);
  ok("nearby results sorted nearest-first", wideDists.every((d, i) => i === 0 || d >= wideDists[i - 1]));

  console.log("— Owner edits restaurant address from frontend —");
  const myRestRes = await req("GET", "/restaurants/owner/my-restaurant", null, ownerToken);
  const myRest = myRestRes.data.data;
  ok("owner fetches own restaurant", myRestRes.status === 200 && !!myRest);
  const origAddr = { location: myRest.location, city: myRest.city, latitude: myRest.latitude, longitude: myRest.longitude };
  const addrUpd = await req("PUT", `/restaurants/${myRest._id}`, {
    location: "12 New Kitchen Lane, Banjara Hills",
    city: "Hyderabad",
    latitude: 17.4126,
    longitude: 78.4392,
  }, ownerToken);
  ok("owner updates address + coordinates via form payload",
    addrUpd.status === 200 && addrUpd.data.data.city === "Hyderabad" && addrUpd.data.data.latitude === 17.4126);
  const pubView = await req("GET", `/restaurants/${myRest._id}`);
  ok("public view reflects new address immediately", pubView.status === 200 && pubView.data.data.city === "Hyderabad");
  const citySearch = await req("GET", "/restaurants?city=Hyderabad");
  ok("restaurant findable by its new city in discover search",
    citySearch.status === 200 && citySearch.data.data.some((r) => r._id === myRest._id));
  const nearNew = await req("GET", "/restaurants/nearby?lat=17.4126&lng=78.4392&radius=5");
  ok("5km nearby search finds it at new coordinates (geo loc synced)",
    nearNew.status === 200 && nearNew.data.data.some((r) => r._id === myRest._id));
  const badLat = await req("PUT", `/restaurants/${myRest._id}`, { latitude: 999 }, ownerToken);
  ok("invalid latitude rejected (400)", badLat.status === 400);
  const custEdit = await req("PUT", `/restaurants/${myRest._id}`, { city: "Nope" }, custToken);
  ok("customer cannot edit restaurant address", custEdit.status === 403);
  // Admin can fix ANY seeded restaurant's full address (the whole point of the admin editor)
  const allAdmin = (await req("GET", "/restaurants/admin/all", null, adminToken)).data.data;
  const miso = allAdmin.find((r) => r.name === "Miso & More");
  const origMiso = { location: miso.location, city: miso.city, latitude: miso.latitude, longitude: miso.longitude };
  const adminEdit = await req("PUT", `/restaurants/${miso._id}`, {
    location: "9 Admin Fixed Road, Bandra West",
    city: "Mumbai",
    latitude: 19.06,
    longitude: 72.84,
  }, adminToken);
  ok("admin edits ANOTHER owner's restaurant full address",
    adminEdit.status === 200 && adminEdit.data.data.location === "9 Admin Fixed Road, Bandra West");
  const pubMiso = await req("GET", `/restaurants/${miso._id}`);
  ok("public view shows the admin-fixed address", pubMiso.status === 200 && pubMiso.data.data.location === "9 Admin Fixed Road, Bandra West");
  const foreignOwner = await req("PUT", `/restaurants/${miso._id}`, { city: "Hacked" }, ownerToken);
  ok("another owner still cannot edit someone else's restaurant", foreignOwner.status === 404);
  const restoreMiso = { location: origMiso.location, city: origMiso.city };
  if (origMiso.latitude != null) restoreMiso.latitude = origMiso.latitude;
  if (origMiso.longitude != null) restoreMiso.longitude = origMiso.longitude;
  const restoredMiso = await req("PUT", `/restaurants/${miso._id}`, restoreMiso, adminToken);
  ok("Miso & More original address restored (cleanup)",
    restoredMiso.status === 200 && restoredMiso.data.data.location === origMiso.location);
  // Restore the original address so repeated runs stay stable
  const restore = { location: origAddr.location, city: origAddr.city };
  if (origAddr.latitude != null) restore.latitude = origAddr.latitude;
  if (origAddr.longitude != null) restore.longitude = origAddr.longitude;
  const restored = await req("PUT", `/restaurants/${myRest._id}`, restore, ownerToken);
  ok("original address restored (cleanup)",
    restored.status === 200 && restored.data.data.city === origAddr.city);

  console.log("— Admin password reset (real owner-access management) —");
  const adminAllRes = await req("GET", "/restaurants/admin/all", null, adminToken);
  ok("admin restaurant listing exposes NO password hashes",
    adminAllRes.status === 200 && !/\$2[aby]\$/.test(JSON.stringify(adminAllRes.data)));
  const misoCard = (adminAllRes.data.data || []).find((x) => x.name === "Miso & More");
  const misoOwnerId = misoCard ? (misoCard.owner?._id || misoCard.owner) : null;
  ok("admin listing includes owner reference", !!misoOwnerId);
  const shortPw = await req("PATCH", `/admin/users/${misoOwnerId}/reset-password`, { newPassword: "123" }, adminToken);
  ok("reset with short password rejected (400)", shortPw.status === 400);
  const anonReset = await req("PATCH", `/admin/users/${misoOwnerId}/reset-password`, { newPassword: "whatever123" });
  ok("unauthenticated reset blocked (401)", anonReset.status === 401);
  const custReset = await req("PATCH", `/admin/users/${misoOwnerId}/reset-password`, { newPassword: "whatever123" }, custToken);
  ok("customer cannot reset passwords (403)", custReset.status === 403);
  const resetPw = await req("PATCH", `/admin/users/${misoOwnerId}/reset-password`, { newPassword: "resetpw123" }, adminToken);
  ok("admin resets owner password", resetPw.status === 200);
  const loginNew = await req("POST", "/auth/login", { email: "owner2@quickfood.com", password: "resetpw123" });
  ok("owner signs in with the NEW password", loginNew.status === 200);
  const restorePw = await req("PATCH", `/admin/users/${misoOwnerId}/reset-password`, { newPassword: "owner123456" }, adminToken);
  ok("original password restored (cleanup)", restorePw.status === 200);
  const loginOld = await req("POST", "/auth/login", { email: "owner2@quickfood.com", password: "owner123456" });
  ok("owner signs in with the RESTORED password", loginOld.status === 200);

  console.log("— Text search: city & street location —");
  const allForSearch = (await req("GET", "/restaurants")).data.data;
  const withCity = allForSearch.find((r) => r.city);
  const cityHit = await req("GET", `/restaurants?city=${encodeURIComponent(withCity.city)}`);
  ok(`city/location filter finds restaurant by its city ("${withCity.city}")`,
    cityHit.status === 200 && cityHit.data.data.some((r) => r._id === withCity._id));
  const textCityHit = await req("GET", `/restaurants?search=${encodeURIComponent(withCity.city)}`);
  ok(`free-text search matches city ("${withCity.city}")`,
    textCityHit.status === 200 && textCityHit.data.data.some((r) => r._id === withCity._id));
  const withStreet = allForSearch.find(
    (r) => r.location && !(r.city || "").toLowerCase().includes(r.location.split(",")[0].trim().toLowerCase())
  );
  if (withStreet) {
    const streetTerm = withStreet.location.split(",")[0].trim();
    const streetHit = await req("GET", `/restaurants?city=${encodeURIComponent(streetTerm)}`);
    ok(`city/location filter matches street line ("${streetTerm}")`,
      streetHit.status === 200 && streetHit.data.data.some((r) => r._id === withStreet._id));
  }
  const noCity = await req("GET", "/restaurants?city=zz-no-such-city-xyz");
  ok("city with no restaurants returns empty list",
    noCity.status === 200 && noCity.data.data.length === 0);
  const regexSafe = await req("GET", "/restaurants?search=(palampur");
  ok("regex-special characters in search handled safely", regexSafe.status === 200);
  const withCoords = allForSearch.find((r) => r.latitude != null && r.longitude != null && r.city);
  const nearbyText = await req(
    "GET",
    `/restaurants/nearby?lat=${withCoords.latitude}&lng=${withCoords.longitude}&radius=50&search=${encodeURIComponent(withCoords.city)}`
  );
  ok("nearby radius search matches city text too",
    nearbyText.status === 200 && nearbyText.data.data.some((r) => r._id === withCoords._id));

  console.log("— Live order tracking & delivery partner —");
  const trackSeedOrder = await req("POST", "/orders", {
    items: [{ menuItem: item._id, quantity: 1 }],
    restaurant: greenFork._id,
    type: "delivery",
    deliveryAddress: { street: "12 Marine Lines", city: "Mumbai", zip: "400020" },
    paymentMethod: "card",
  }, custToken);
  ok("delivery order placed for tracking", trackSeedOrder.status === 201);
  const tOrderId = trackSeedOrder.data.data._id;

  for (const st of ["confirmed", "preparing", "ready"]) {
    await req("PATCH", `/orders/${tOrderId}/status`, { status: st }, ownerToken);
  }
  const directOfd = await req("PATCH", `/orders/${tOrderId}/status`, { status: "out_for_delivery" }, ownerToken);
  ok("owner marks order out_for_delivery directly (no partner yet)",
    directOfd.status === 200 && directOfd.data.data.status === "out_for_delivery");

  const trackWaiting = await req("GET", `/orders/${tOrderId}/track`, null, custToken);
  ok("customer tracks own out_for_delivery order",
    trackWaiting.status === 200 && trackWaiting.data.data.status === "out_for_delivery");
  ok("no partner assigned → deliveryPartner null (UI waiting state)", trackWaiting.data.data.deliveryPartner === null);
  ok("track payload has restaurant, address and timeline",
    !!trackWaiting.data.data.restaurant?.name &&
    !!trackWaiting.data.data.deliveryAddress &&
    Array.isArray(trackWaiting.data.data.statusUpdates));

  const otherCust = await req("POST", "/auth/signup", {
    name: "Other Customer",
    email: `othercust-${uniq}@quickfood.com`,
    password: "othercust123456",
    role: "customer",
  });
  const forbiddenTrack = await req("GET", `/orders/${tOrderId}/track`, null, otherCust.data?.token);
  ok("another customer cannot track (403)", forbiddenTrack.status === 403);

  const partnerSignup = await req("POST", "/auth/signup", {
    name: "Smoke Partner",
    email: `partner-${uniq}@quickfood.com`,
    password: "partner123456",
    role: "customer",
    isDeliveryPartner: true,
    phone: `9${String(uniq).slice(-9)}`,
  });
  ok("delivery partner signup (customer + isDeliveryPartner flag)",
    partnerSignup.status === 201 && partnerSignup.data?.user?.isDeliveryPartner === true);
  const partnerToken = partnerSignup.data?.token;

  const acceptClaim = await req("PATCH", `/orders/${tOrderId}/accept`, null, partnerToken);
  ok("partner claims unassigned out_for_delivery order",
    acceptClaim.status === 200 && acceptClaim.data.data.status === "out_for_delivery" && !!acceptClaim.data.data.deliveryPartner);

  const locUpdate = await req("PATCH", `/orders/${tOrderId}/location`, { lat: 19.0805, lng: 72.8811 }, partnerToken);
  ok("partner shares live location", locUpdate.status === 200);

  const trackLive = await req("GET", `/orders/${tOrderId}/track`, null, custToken);
  ok("customer sees partner + live coords while tracking",
    trackLive.status === 200 &&
    !!trackLive.data.data.deliveryPartner?.name &&
    trackLive.data.data.deliveryPartner?.location?.lat === 19.0805 &&
    trackLive.data.data.deliveryPartner?.location?.lng === 72.8811);

  const partnerDelivered = await req("PATCH", `/orders/${tOrderId}/delivered`, null, partnerToken);
  ok("partner marks order delivered", partnerDelivered.status === 200 && partnerDelivered.data.data.status === "delivered");

  console.log(`\nResult: ${pass} passed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
};

run().catch((e) => { console.error("Smoke test crashed:", e); process.exit(1); });
