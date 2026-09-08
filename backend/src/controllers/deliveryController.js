import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Order from "../models/Order.js";
import User from "../models/User.js";
import DeliveryPartner from "../models/DeliveryPartner.js";
import DeliveryEarning from "../models/DeliveryEarning.js";
import Payout from "../models/Payout.js";
import { createNotification } from "../utils/notificationService.js";
import {
  getDeliverySettings,
  haversineKm,
  computeFeeBreakdown,
} from "../utils/deliveryFee.js";
import { settleDeliveryEarning } from "../utils/deliverySettlement.js";

// ---------- shared constants / helpers ----------

/** Delivery stages that count as "in progress" (assigned but unaccepted included). */
export const ACTIVE_DELIVERY_STATUSES = [
  "assigned",
  "accepted",
  "reached_restaurant",
  "picked_up",
  "out_for_delivery",
];

/** Extract the user-id string from a populated DeliveryPartner profile. */
const partnerUserId = (p) => p?.user?._id?.toString();

const PARTNER_ORDER_POPULATE = [
  { path: "restaurant", select: "name location city latitude longitude phone" },
  { path: "customer", select: "name phone email" },
  { path: "items.menuItem", select: "name price" },
  { path: "deliveryPartner", select: "name phone" },
];

const pushStatusUpdate = (order, status, note) => {
  order.statusUpdates = order.statusUpdates || [];
  order.statusUpdates.push({ status, timestamp: new Date(), note });
};

/** Notify every admin (delivery rejections, completions…). */
const notifyAdmins = async (payload) => {
  try {
    const admins = await User.find({ role: "admin" }).select("_id");
    await Promise.all(admins.map((a) => createNotification(a._id, payload)));
  } catch (error) {
    console.error("notifyAdmins failed:", error.message);
  }
};

const addressLine = (address) =>
  !address
    ? ""
    : [address.street, address.city, address.state, address.zip]
        .filter(Boolean)
        .join(", ");

// ============================================================
// 1. Registration — public endpoint, partner starts as "pending"
// ============================================================

export const registerDeliveryPartner = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      avatar,
      vehicleType,
      vehicleNumber,
      address,
      city,
      idDocument,
    } = req.body;

    const existingUser = await User.findOne({ email: String(email).toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const user = new User({
      name,
      email,
      password,
      phone,
      role: "delivery_partner",
      avatar,
      address,
      city,
      isAvailable: false,
    });
    await user.save();

    const profile = await DeliveryPartner.create({
      user: user._id,
      vehicleType: vehicleType || "bike",
      vehicleNumber,
      address,
      city,
      idDocument,
      status: "pending",
    });

    await createNotification(user._id, {
      type: "delivery",
      title: "Welcome, Delivery Partner",
      message:
        "Your delivery partner account has been created and is pending admin approval. You will be able to accept deliveries once approved.",
    });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(201).json({
      message: "Registration successful. Your account is pending admin approval.",
      token,
      user: user.toJSON(),
      profile,
    });
  } catch (error) {
    // Duplicate phone (unique sparse index) or other race — surface clearly
    if (error.code === 11000) {
      return res.status(409).json({ message: "Email or phone already registered" });
    }
    next(error);
  }
};

// ============================================================
// 2. Partner self-service — profile, availability, location
// ============================================================

/** GET /delivery/me — profile + wallet summary + delivery stats. */
export const getMyPartnerProfile = async (req, res, next) => {
  try {
    const profile = await DeliveryPartner.findOne({ user: req.user._id }).populate(
      "user",
      "name email phone avatar address city currentLocation isAvailable"
    );
    if (!profile) {
      return res.status(404).json({ message: "Delivery partner profile not found" });
    }

    const [wallet, activeCount, completedCount] = await Promise.all([
      DeliveryEarning.aggregate([
        { $match: { partner: req.user._id } },
        {
          $group: {
            _id: null,
            total: { $sum: "$partnerEarning" },
            paid: { $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$partnerEarning", 0] } },
            pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, "$partnerEarning", 0] } },
          },
        },
      ]),
      Order.countDocuments({
        deliveryPartner: req.user._id,
        "delivery.status": { $in: ACTIVE_DELIVERY_STATUSES },
        status: { $nin: ["delivered", "cancelled"] },
      }),
      Order.countDocuments({ deliveryPartner: req.user._id, status: "delivered" }),
    ]);

    res.json({
      success: true,
      data: {
        profile,
        wallet: wallet[0] || { total: 0, paid: 0, pending: 0 },
        activeDeliveries: activeCount,
        completedDeliveries: completedCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/** PUT /delivery/profile — partner edits their own profile (never status). */
export const updatePartnerProfile = async (req, res, next) => {
  try {
    const profile = await DeliveryPartner.findOne({ user: req.user._id });
    if (!profile) {
      return res.status(404).json({ message: "Delivery partner profile not found" });
    }

    const userFields = ["avatar", "phone", "address", "city"];
    const profileFields = ["vehicleType", "vehicleNumber", "address", "city", "idDocument", "locationPermission"];

    for (const key of userFields) {
      if (req.body[key] !== undefined) req.user[key] = req.body[key];
    }
    for (const key of profileFields) {
      if (req.body[key] !== undefined) profile[key] = req.body[key];
    }
    await req.user.save();
    await profile.save();

    res.json({ message: "Profile updated", data: profile });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /delivery/availability — the "Available for Delivery / Offline" toggle.
 * Only approved partners can go online; pending/rejected/suspended cannot.
 */
export const setAvailability = async (req, res, next) => {
  try {
    const { isAvailable } = req.body;
    if (typeof isAvailable !== "boolean") {
      return res.status(400).json({ message: "isAvailable must be a boolean" });
    }

    const profile = await DeliveryPartner.findOne({ user: req.user._id });
    if (!profile) {
      return res.status(404).json({ message: "Delivery partner profile not found" });
    }
    if (["pending", "rejected"].includes(profile.status)) {
      return res.status(403).json({ message: "Your account is awaiting admin approval" });
    }
    if (profile.status === "suspended") {
      return res.status(403).json({ message: "Your account is suspended" });
    }

    if (isAvailable) {
      profile.status = "active";
    } else {
      // Going offline with a delivery in hand is not allowed — the customer is waiting
      const inProgress = await Order.countDocuments({
        deliveryPartner: req.user._id,
        "delivery.status": { $in: ["picked_up", "out_for_delivery"] },
        status: { $nin: ["delivered", "cancelled"] },
      });
      if (inProgress > 0) {
        return res.status(400).json({
          message: "You have deliveries in progress. Complete them before going offline.",
        });
      }
      profile.status = "offline";
      // Stop tracking automatically when the partner goes offline
      req.user.currentLocation = null;
    }

    req.user.isAvailable = isAvailable;
    profile.lastActiveAt = new Date();
    await req.user.save();
    await profile.save();

    res.json({
      message: isAvailable ? "You are now available for deliveries" : "You are now offline",
      data: { status: profile.status, isAvailable: req.user.isAvailable },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /delivery/location — partner pushes live coordinates while delivering.
 * Tracking only runs while the partner is available (their consent toggle).
 */
export const updatePartnerLocation = async (req, res, next) => {
  try {
    const { lat, lng } = req.body;
    if (lat === undefined || lng === undefined || isNaN(parseFloat(lat)) || isNaN(parseFloat(lng))) {
      return res.status(400).json({ message: "lat and lng are required" });
    }

    req.user.currentLocation = { lat: parseFloat(lat), lng: parseFloat(lng) };
    await req.user.save();

    await DeliveryPartner.updateOne(
      { user: req.user._id },
      { lastActiveAt: new Date() }
    );

    res.json({ message: "Location updated", data: req.user.currentLocation });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 3. Partner delivery views — requests, active, history
// ============================================================

const partnerOrderFilter = (partnerId) => ({
  deliveryPartner: partnerId,
  status: { $nin: ["cancelled"] },
});

/** GET /delivery/requests — orders assigned to me, awaiting my accept/reject. */
export const getMyDeliveryRequests = async (req, res, next) => {
  try {
    const orders = await Order.find({
      ...partnerOrderFilter(req.user._id),
      "delivery.status": "assigned",
    })
      .populate(PARTNER_ORDER_POPULATE)
      .sort({ "delivery.assignedAt": -1 });
    res.json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    next(error);
  }
};

/** GET /delivery/active — orders I accepted and am currently delivering. */
export const getMyActiveDeliveries = async (req, res, next) => {
  try {
    const orders = await Order.find({
      ...partnerOrderFilter(req.user._id),
      "delivery.status": { $in: ["accepted", "reached_restaurant", "picked_up", "out_for_delivery"] },
    })
      .populate(PARTNER_ORDER_POPULATE)
      .sort({ "delivery.acceptedAt": -1 });
    res.json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    next(error);
  }
};

/** GET /delivery/history — completed delivery history (paginated). */
export const getMyDeliveryHistory = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = parseInt(req.query.skip) || 0;
    const [orders, total] = await Promise.all([
      Order.find({ deliveryPartner: req.user._id, status: "delivered" })
        .populate(PARTNER_ORDER_POPULATE)
        .sort({ "delivery.deliveredAt": -1, createdAt: -1 })
        .limit(limit)
        .skip(skip),
      Order.countDocuments({ deliveryPartner: req.user._id, status: "delivered" }),
    ]);
    res.json({ success: true, count: orders.length, total, data: orders });
  } catch (error) {
    next(error);
  }
};

/** Load the order and verify the requesting partner is the assignee. */
const loadAssignedOrder = async (req) => {
  const order = await Order.findById(req.params.id)
    .populate("customer", "name phone email")
    .populate("restaurant", "name phone address")
    .populate("deliveryPartner", "name phone");
  if (!order) return { error: { status: 404, message: "Order not found" } };
  if (!order.deliveryPartner || order.deliveryPartner.toString() !== req.user._id.toString()) {
    return { error: { status: 403, message: "You are not assigned to this order" } };
  }
  return { order };
};

/** PATCH /delivery/orders/:id/accept — step 6: Delivery Partner Accepted. */
export const acceptDeliveryRequest = async (req, res, next) => {
  try {
    const { order, error } = await loadAssignedOrder(req);
    if (error) return res.status(error.status).json({ message: error.message });

    const profile = await DeliveryPartner.findOne({ user: req.user._id });
    if (!profile || profile.status === "suspended") {
      return res.status(403).json({ message: "Your account cannot accept deliveries" });
    }
    if (order.delivery.status !== "assigned") {
      return res.status(400).json({
        message: `This delivery request is no longer pending (status: ${order.delivery.status})`,
      });
    }

    order.delivery.status = "accepted";
    order.delivery.acceptedAt = new Date();
    pushStatusUpdate(order, "delivery_accepted", "Delivery partner accepted the assignment");
    const historyEntry = [...(order.assignmentHistory || [])]
      .reverse()
      .find(
        (h) => h.partner?.toString() === req.user._id.toString() && h.outcome === "assigned"
      );
    if (historyEntry) historyEntry.outcome = "accepted";
    await order.save();

    profile.status = "busy";
    profile.lastActiveAt = new Date();
    await profile.save();
    req.user.isAvailable = false;
    await req.user.save();

    await notifyAdmins({
      type: "delivery",
      title: "Delivery Accepted",
      message: `${req.user.name} accepted delivery ${order.orderNumber}.`,
      relatedId: order._id,
    });

    res.json({ message: "Delivery accepted", data: order });
  } catch (error) {
    next(error);
  }
};

/** PATCH /delivery/orders/:id/reject — unassigns the order back to the pool. */
export const rejectDeliveryRequest = async (req, res, next) => {
  try {
    const { order, error } = await loadAssignedOrder(req);
    if (error) return res.status(error.status).json({ message: error.message });

    if (order.delivery.status !== "assigned") {
      return res.status(400).json({
        message: `This delivery request is no longer pending (status: ${order.delivery.status})`,
      });
    }

    const reason = req.body.reason || "Rejected by delivery partner";
    order.delivery.status = "rejected";
    order.delivery.rejectedAt = new Date();
    order.delivery.rejectionReason = reason;
    order.deliveryPartner = undefined;
    order.delivery.assignedBy = undefined;
    order.delivery.assignedAt = undefined;
    order.delivery.acceptedAt = undefined;
    pushStatusUpdate(order, "delivery_rejected", `Delivery partner rejected: ${reason}`);
    const historyEntry = [...(order.assignmentHistory || [])]
      .reverse()
      .find(
        (h) => h.partner?.toString() === req.user._id.toString() && h.outcome === "assigned"
      );
    if (historyEntry) {
      historyEntry.outcome = "rejected";
      historyEntry.reason = reason;
    }
    await order.save();

    const profile = await DeliveryPartner.findOne({ user: req.user._id });
    if (profile) {
      profile.status = "active";
      await profile.save();
    }
    req.user.isAvailable = true;
    await req.user.save();

    await notifyAdmins({
      type: "delivery",
      title: "Delivery Rejected",
      message: `${req.user.name} rejected delivery ${order.orderNumber}. Reason: ${reason}. You can assign it to another partner.`,
      relatedId: order._id,
    });

    res.json({ message: "Delivery rejected", data: order });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 4. Partner status-flow actions (steps 7-10)
// ============================================================

const transitionDelivery = (order, from, to, timestampKey, note) => {
  if (order.delivery.status !== from) {
    return `Cannot move from "${order.delivery.status}" to "${to}" — expected "${from}"`;
  }
  order.delivery.status = to;
  if (timestampKey) order.delivery[timestampKey] = new Date();
  pushStatusUpdate(order, to, note);
  return null;
};

/** PATCH /delivery/orders/:id/reached — step 7: partner reached the restaurant. */
export const markReachedRestaurant = async (req, res, next) => {
  try {
    const { order, error } = await loadAssignedOrder(req);
    if (error) return res.status(error.status).json({ message: error.message });

    const err = transitionDelivery(
      order,
      "accepted",
      "reached_restaurant",
      "reachedRestaurantAt",
      "Delivery partner reached the restaurant to pick up"
    );
    if (err) return res.status(400).json({ message: err });
    order.delivery.pickupStartedAt = order.delivery.pickupStartedAt || new Date();
    await order.save();
    res.json({ message: "Pickup started", data: order });
  } catch (error) {
    next(error);
  }
};

/** PATCH /delivery/orders/:id/picked-up — step 8: order picked up. */
export const markPickedUp = async (req, res, next) => {
  try {
    const { order, error } = await loadAssignedOrder(req);
    if (error) return res.status(error.status).json({ message: error.message });

    const err = transitionDelivery(
      order,
      "reached_restaurant",
      "picked_up",
      "pickedUpAt",
      "Order picked up from restaurant"
    );
    if (err) return res.status(400).json({ message: err });
    await order.save();
    res.json({ message: "Order marked as picked up", data: order });
  } catch (error) {
    next(error);
  }
};

/** PATCH /delivery/orders/:id/start-delivery — step 9: out for delivery. */
export const startDelivery = async (req, res, next) => {
  try {
    const { order, error } = await loadAssignedOrder(req);
    if (error) return res.status(error.status).json({ message: error.message });

    const err = transitionDelivery(
      order,
      "picked_up",
      "out_for_delivery",
      null,
      "Out for delivery"
    );
    if (err) return res.status(400).json({ message: err });
    order.status = "out_for_delivery";
    await order.save();

    await createNotification(order.customer, {
      type: "order",
      title: "Order out for delivery",
      message: `Your order ${order.orderNumber} is on its way! You can now track the delivery partner live.`,
      relatedId: order._id,
    });

    res.json({ message: "Delivery started", data: order });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /delivery/orders/:id/delivered — step 10.
 * Marks delivered, stops tracking, and automatically creates the earnings
 * record splitting the delivery charge between partner and platform.
 */
export const markOrderDeliveredByPartner = async (req, res, next) => {
  try {
    const { order, error } = await loadAssignedOrder(req);
    if (error) return res.status(error.status).json({ message: error.message });

    const err = transitionDelivery(
      order,
      "out_for_delivery",
      "delivered",
      "deliveredAt",
      "Order delivered"
    );
    if (err) return res.status(400).json({ message: err });

    order.status = "delivered";
    order.actualDeliveryTime = new Date();
    order.paymentStatus = "completed";
    order.delivery.trackingEnabled = false;
    const historyEntry = [...(order.assignmentHistory || [])]
      .reverse()
      .find(
        (h) => h.partner?.toString() === req.user._id.toString() && h.outcome === "accepted"
      );
    if (historyEntry) historyEntry.outcome = "completed";
    await order.save();

    // ---------- automatic earnings record + partner stats (shared, idempotent) ----------
    const { earning, partnerEarning, adminEarning, stillBusy } = await settleDeliveryEarning({
      order,
      partnerUserId: req.user._id,
    });

    // Stop tracking automatically when the order is delivered
    req.user.isAvailable = stillBusy === 0;
    req.user.currentLocation = null;
    await req.user.save();

    await createNotification(order.customer, {
      type: "order",
      title: "Order Delivered",
      message: `Your order ${order.orderNumber} has been delivered. Enjoy!`,
      relatedId: order._id,
    });
    await notifyAdmins({
      type: "delivery",
      title: "Delivery Completed",
      message: `Delivery ${order.orderNumber} completed by ${req.user.name}. Partner earning ₹${partnerEarning}, platform earning ₹${adminEarning}.`,
      relatedId: order._id,
    });

    res.json({ message: "Order delivered", data: order, earning });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 5. Partner earnings / wallet / payouts
// ============================================================

/** GET /delivery/earnings — partner sees only their own earnings. */
export const getMyEarnings = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = { partner: req.user._id };
    if (status && ["pending", "paid"].includes(status)) filter.status = status;

    const [earnings, totals] = await Promise.all([
      DeliveryEarning.find(filter)
        .sort({ completedAt: -1 })
        .limit(Math.min(parseInt(req.query.limit) || 50, 200)),
      DeliveryEarning.aggregate([
        { $match: { partner: req.user._id } },
        {
          $group: {
            _id: null,
            total: { $sum: "$partnerEarning" },
            paid: { $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$partnerEarning", 0] } },
            pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, "$partnerEarning", 0] } },
            completedDeliveries: { $sum: 1 },
          },
        },
      ]),
    ]);

    res.json({
      success: true,
      count: earnings.length,
      data: {
        summary: totals[0] || { total: 0, paid: 0, pending: 0, completedDeliveries: 0 },
        earnings,
      },
    });
  } catch (error) {
    next(error);
  }
};

/** GET /delivery/wallet — available balance, pending/paid/total, payout history. */
export const getMyWallet = async (req, res, next) => {
  try {
    const [totals, payouts, completedDeliveries] = await Promise.all([
      DeliveryEarning.aggregate([
        { $match: { partner: req.user._id } },
        {
          $group: {
            _id: null,
            total: { $sum: "$partnerEarning" },
            paid: { $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$partnerEarning", 0] } },
            pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, "$partnerEarning", 0] } },
          },
        },
      ]),
      Payout.find({ partner: req.user._id }).sort({ createdAt: -1 }).limit(20),
      Order.countDocuments({ deliveryPartner: req.user._id, status: "delivered" }),
    ]);

    const summary = totals[0] || { total: 0, paid: 0, pending: 0 };
    res.json({
      success: true,
      data: {
        availableBalance: summary.pending, // earnings the admin can pay out now
        pendingEarnings: summary.pending,
        paidEarnings: summary.paid,
        totalEarnings: summary.total,
        completedDeliveries,
        payouts,
      },
    });
  } catch (error) {
    next(error);
  }
};

/** GET /delivery/earnings/payouts — partner's own payout history. */
export const getMyPayouts = async (req, res, next) => {
  try {
    const payouts = await Payout.find({ partner: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ success: true, count: payouts.length, data: payouts });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 6. Admin — delivery partner management
// ============================================================

/** GET /delivery/partners?search=&status=&city= — all partners with live stats. */
export const listDeliveryPartners = async (req, res, next) => {
  try {
    const { search, status, city } = req.query;
    const filter = {};

    if (search) {
      const users = await User.find({
        role: "delivery_partner",
        $or: [
          { name: new RegExp(String(search).trim(), "i") },
          { email: new RegExp(String(search).trim(), "i") },
          { phone: new RegExp(String(search).trim(), "i") },
        ],
      }).select("_id");
      filter.user = { $in: users.map((u) => u._id) };
    }
    if (status && status !== "all") {
      filter.status = status;
    }
    if (city) {
      filter.city = new RegExp(String(city).trim(), "i");
    }

    const profiles = await DeliveryPartner.find(filter)
      .populate("user", "name email phone avatar address city currentLocation isAvailable isActive createdAt")
      .sort({ createdAt: -1 });

    // Live counters per partner: active deliveries + pending earnings
    const partnerIds = profiles.map((p) => p.user?._id).filter(Boolean);
    const [activeAgg, earningAgg] = await Promise.all([
      Order.aggregate([
        {
          $match: {
            deliveryPartner: { $in: partnerIds },
            "delivery.status": { $in: ACTIVE_DELIVERY_STATUSES },
            status: { $nin: ["delivered", "cancelled"] },
          },
        },
        { $group: { _id: "$deliveryPartner", count: { $sum: 1 } } },
      ]),
      DeliveryEarning.aggregate([
        { $match: { partner: { $in: partnerIds }, status: "pending" } },
        { $group: { _id: "$partner", pending: { $sum: "$partnerEarning" } } },
      ]),
    ]);
    const activeMap = new Map(activeAgg.map((r) => [r._id.toString(), r.count]));
    const pendingMap = new Map(earningAgg.map((r) => [r._id.toString(), r.pending]));

    const data = profiles.map((p) => ({
      ...p.toJSON(),
      activeDeliveries: activeMap.get(partnerUserId(p)) || 0,
      pendingPayout: pendingMap.get(partnerUserId(p)) || 0,
    }));

    res.json({ success: true, count: data.length, data });
  } catch (error) {
    next(error);
  }
};

/** GET /delivery/partners/:id — full profile + deliveries + earnings + payouts. */
export const getDeliveryPartnerDetail = async (req, res, next) => {
  try {
    const profile = await DeliveryPartner.findById(req.params.id).populate(
      "user",
      "name email phone avatar address city currentLocation isAvailable isActive createdAt"
    );
    if (!profile) {
      return res.status(404).json({ message: "Delivery partner not found" });
    }

    const [activeDeliveries, completedDeliveries, earningsAgg, payouts] = await Promise.all([
      Order.find({
        deliveryPartner: partnerUserId(profile),
        "delivery.status": { $in: ACTIVE_DELIVERY_STATUSES },
        status: { $nin: ["delivered", "cancelled"] },
      })
        .populate("restaurant", "name")
        .populate("customer", "name phone")
        .sort({ "delivery.assignedAt": -1 }),
      Order.find({ deliveryPartner: partnerUserId(profile), status: "delivered" })
        .populate("restaurant", "name")
        .populate("customer", "name phone")
        .sort({ "delivery.deliveredAt": -1 })
        .limit(25),
      DeliveryEarning.aggregate([
        // NOTE: aggregate() does NO schema casting — the string from
        // partnerUserId() must be converted to ObjectId to match the stored
        // `partner` field (which is saved as an ObjectId).
        { $match: { partner: new mongoose.Types.ObjectId(partnerUserId(profile)) } },
        {
          $group: {
            _id: null,
            totalDeliveryCharges: { $sum: "$totalDeliveryCharge" },
            partnerTotal: { $sum: "$partnerEarning" },
            adminTotal: { $sum: "$adminEarning" },
            paid: { $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$partnerEarning", 0] } },
            pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, "$partnerEarning", 0] } },
            deliveries: { $sum: 1 },
          },
        },
      ]),
      Payout.find({ partner: partnerUserId(profile) }).sort({ createdAt: -1 }).limit(10),
    ]);

    res.json({
      success: true,
      data: {
        profile,
        activeDeliveries,
        completedDeliveries,
        earnings: earningsAgg[0] || {
          totalDeliveryCharges: 0,
          partnerTotal: 0,
          adminTotal: 0,
          paid: 0,
          pending: 0,
          deliveries: 0,
        },
        payouts,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ---------- approval / moderation ----------

const loadPartnerProfile = async (req) => {
  const profile = await DeliveryPartner.findById(req.params.id);
  if (!profile) return null;
  return profile;
};

/** PATCH /delivery/partners/:id/approve — pending → approved. */
export const approveDeliveryPartner = async (req, res, next) => {
  try {
    const profile = await loadPartnerProfile(req);
    if (!profile) return res.status(404).json({ message: "Delivery partner not found" });
    if (profile.status !== "pending") {
      return res.status(400).json({ message: `Only pending partners can be approved (current: ${profile.status})` });
    }

    profile.status = "approved";
    profile.approvedAt = new Date();
    profile.approvedBy = req.user._id;
    profile.rejectionReason = undefined;
    await profile.save();

    await createNotification(profile.user, {
      type: "delivery",
      title: "Account Approved",
      message: "Your delivery partner account has been approved! You can now go online and start accepting deliveries.",
      relatedId: profile._id,
    });

    res.json({ message: "Delivery partner approved", data: profile });
  } catch (error) {
    next(error);
  }
};

/** PATCH /delivery/partners/:id/reject — pending → rejected with reason. */
export const rejectDeliveryPartner = async (req, res, next) => {
  try {
    const profile = await loadPartnerProfile(req);
    if (!profile) return res.status(404).json({ message: "Delivery partner not found" });
    if (profile.status !== "pending") {
      return res.status(400).json({ message: `Only pending partners can be rejected (current: ${profile.status})` });
    }

    profile.status = "rejected";
    profile.rejectionReason = req.body.reason || "Does not meet requirements";
    await profile.save();

    await createNotification(profile.user, {
      type: "delivery",
      title: "Account Rejected",
      message: `Your delivery partner application was rejected. Reason: ${profile.rejectionReason}`,
      relatedId: profile._id,
    });

    res.json({ message: "Delivery partner rejected", data: profile });
  } catch (error) {
    next(error);
  }
};

/** PATCH /delivery/partners/:id/suspend — blocks new assignments immediately. */
export const suspendDeliveryPartner = async (req, res, next) => {
  try {
    const profile = await loadPartnerProfile(req);
    if (!profile) return res.status(404).json({ message: "Delivery partner not found" });
    if (profile.status === "suspended") {
      return res.status(400).json({ message: "Partner is already suspended" });
    }

    profile.status = "suspended";
    profile.suspendedReason = req.body.reason || "Suspended by admin";
    await profile.save();

    await User.updateOne({ _id: profile.user }, { isAvailable: false, currentLocation: null });

    await createNotification(profile.user, {
      type: "delivery",
      title: "Account Suspended",
      message: `Your delivery partner account has been suspended. Reason: ${profile.suspendedReason}`,
      relatedId: profile._id,
    });

    res.json({ message: "Delivery partner suspended", data: profile });
  } catch (error) {
    next(error);
  }
};

/** PATCH /delivery/partners/:id/activate — suspended → approved (offline). */
export const activateDeliveryPartner = async (req, res, next) => {
  try {
    const profile = await loadPartnerProfile(req);
    if (!profile) return res.status(404).json({ message: "Delivery partner not found" });
    if (profile.status !== "suspended" && profile.status !== "rejected") {
      return res.status(400).json({ message: `Only suspended/rejected partners can be activated (current: ${profile.status})` });
    }

    profile.status = "approved";
    profile.suspendedReason = undefined;
    profile.rejectionReason = undefined;
    await profile.save();

    await createNotification(profile.user, {
      type: "delivery",
      title: "Account Re-activated",
      message: "Your delivery partner account has been re-activated. You can go online again.",
      relatedId: profile._id,
    });

    res.json({ message: "Delivery partner activated", data: profile });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 7. Admin — delivery assignment
// ============================================================

/** GET /delivery/available-partners?orderId= — candidates for assignment. */
export const getAvailableDeliveryPartners = async (req, res, next) => {
  try {
    const order = await Order.findById(req.query.orderId).populate(
      "restaurant",
      "name latitude longitude location city"
    );
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Approved partners only; all working states are eligible (admin assignment
    // is the manual override mentioned in the availability rules).
    const profiles = await DeliveryPartner.find({
      status: { $in: ["approved", "active", "busy"] },
    }).populate("user", "name phone avatar currentLocation isAvailable");

    const activeAgg = await Order.aggregate([
      {
        $match: {
          "delivery.status": { $in: ACTIVE_DELIVERY_STATUSES },
          status: { $nin: ["delivered", "cancelled"] },
        },
      },
      { $group: { _id: "$deliveryPartner", count: { $sum: 1 } } },
    ]);
    const activeMap = new Map(activeAgg.map((r) => [r._id.toString(), r.count]));

    const restaurantCoords = order.restaurant
      ? { lat: order.restaurant.latitude, lng: order.restaurant.longitude }
      : null;
    const customerCoords = order.deliveryAddress
      ? { lat: order.deliveryAddress.latitude, lng: order.deliveryAddress.longitude }
      : null;

    const candidates = profiles.map((p) => {
      const partnerLoc = p.user?.currentLocation || null;
      const distanceFromRestaurant =
        partnerLoc && restaurantCoords
          ? haversineKm(partnerLoc.lat, partnerLoc.lng, restaurantCoords.lat, restaurantCoords.lng)
          : null;
      const distanceToCustomer =
        restaurantCoords && customerCoords
          ? haversineKm(restaurantCoords.lat, restaurantCoords.lng, customerCoords.lat, customerCoords.lng)
          : null;

      return {
        _id: p._id,
        user: p.user,
        status: p.status,
        vehicleType: p.vehicleType,
        vehicleNumber: p.vehicleNumber,
        city: p.city,
        completedDeliveries: p.completedDeliveries,
        activeDeliveries: activeMap.get(partnerUserId(p)) || 0,
        currentLocation: partnerLoc,
        distanceFromRestaurant,
        distanceToCustomer,
        // "available" = online, not busy, no active delivery
        isAvailable: p.status === "active" && (activeMap.get(partnerUserId(p)) || 0) === 0,
      };
    });

    // Best candidates first: online with free hands, then fewest active, then most completed
    candidates.sort(
      (a, b) =>
        Number(b.isAvailable) - Number(a.isAvailable) ||
        a.activeDeliveries - b.activeDeliveries ||
        b.completedDeliveries - a.completedDeliveries
    );

    res.json({
      success: true,
      count: candidates.length,
      data: {
        order: {
          _id: order._id,
          orderNumber: order.orderNumber,
          status: order.status,
          delivery: order.delivery,
          restaurant: order.restaurant,
          deliveryAddress: order.deliveryAddress,
          assignmentHistory: order.assignmentHistory,
        },
        partners: candidates,
      },
    });
  } catch (error) {
    next(error);
  }
};

/** POST /delivery/assign {orderId, partnerId} — admin assigns a delivery. */
export const assignDelivery = async (req, res, next) => {
  try {
    const { orderId, partnerId } = req.body;
    if (!orderId || !partnerId) {
      return res.status(400).json({ message: "orderId and partnerId are required" });
    }

    const order = await Order.findById(orderId).populate("restaurant", "name latitude longitude");
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.type !== "delivery") {
      return res.status(400).json({ message: "Only delivery orders can be assigned" });
    }

    const assignable =
      ["confirmed", "preparing", "ready"].includes(order.status) ||
      (order.status === "out_for_delivery" && !order.deliveryPartner);
    if (!assignable) {
      return res.status(400).json({
        message: `Order cannot be assigned in its current state (${order.status}${
          order.delivery?.status ? ` / ${order.delivery.status}` : ""
        })`,
      });
    }

    // Block reassignment while another partner holds an accepted assignment
    if (
      order.deliveryPartner &&
      order.deliveryPartner.toString() !== partnerId &&
      order.delivery?.status &&
      ["accepted", "reached_restaurant", "picked_up", "out_for_delivery"].includes(order.delivery.status)
    ) {
      return res.status(409).json({
        message: "This order already has an accepted delivery partner",
      });
    }

    const profile = await DeliveryPartner.findById(partnerId).populate(
      "user",
      "name isAvailable"
    );
    if (!profile) return res.status(404).json({ message: "Delivery partner not found" });
    if (["suspended", "rejected", "pending"].includes(profile.status)) {
      return res.status(400).json({
        message: `This partner cannot be assigned (account status: ${profile.status})`,
      });
    }

    // Fee split (settings-based when distance is known, else the order's charge)
    const settings = await getDeliverySettings();
    const distanceKm =
      order.restaurant?.latitude !== undefined &&
      order.restaurant?.latitude !== null &&
      order.deliveryAddress?.latitude !== undefined &&
      order.deliveryAddress?.latitude !== null
        ? haversineKm(
            order.restaurant.latitude,
            order.restaurant.longitude,
            order.deliveryAddress.latitude,
            order.deliveryAddress.longitude
          )
        : null;
    const breakdown = await computeFeeBreakdown({
      settings,
      orderDeliveryCharge: order.deliveryCharge,
      distanceKm,
    });

    order.deliveryPartner = profile.user._id;
    order.delivery = {
      ...order.delivery?.toObject?.(),
      status: "assigned",
      assignedBy: req.user._id,
      assignedAt: new Date(),
      acceptedAt: undefined,
      rejectedAt: undefined,
      rejectionReason: undefined,
      reachedRestaurantAt: undefined,
      pickedUpAt: undefined,
      deliveredAt: undefined,
      fee: breakdown.fee,
      partnerEarning: breakdown.partnerEarning,
      adminEarning: breakdown.adminEarning,
      distanceKm: breakdown.distanceKm,
      trackingEnabled: false,
    };
    order.assignmentHistory = order.assignmentHistory || [];
    order.assignmentHistory.push({
      partner: profile.user._id,
      assignedBy: req.user._id,
      assignedAt: new Date(),
      outcome: "assigned",
    });
    pushStatusUpdate(order, "delivery_assigned", `Assigned to ${profile.user.name}`);
    await order.save();

    await createNotification(profile.user._id, {
      type: "delivery",
      title: "New Delivery Assigned",
      message: `Order ${order.orderNumber} has been assigned to you. Pickup: ${
        order.restaurant?.name || "restaurant"
      }. Delivery: ${addressLine(order.deliveryAddress)}`,
      relatedId: order._id,
      data: {
        orderId: order._id,
        pickup: order.restaurant?.name,
        delivery: addressLine(order.deliveryAddress),
      },
    });

    res.json({ message: "Delivery assigned successfully", data: order });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 8. Admin — delivery order lists + overview
// ============================================================

const ADMIN_DELIVERY_POPULATE = [
  { path: "restaurant", select: "name location city latitude longitude" },
  { path: "customer", select: "name phone email" },
  { path: "deliveryPartner", select: "name phone avatar currentLocation isAvailable" },
  { path: "items.menuItem", select: "name price" },
];

/** GET /delivery/orders/unassigned — waiting for a delivery partner. */
export const getUnassignedOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({
      type: "delivery",
      status: { $in: ["confirmed", "preparing", "ready", "out_for_delivery"] },
      $or: [{ deliveryPartner: null }, { deliveryPartner: { $exists: false } }],
    })
      .populate(ADMIN_DELIVERY_POPULATE)
      .sort({ createdAt: 1 });
    res.json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    next(error);
  }
};

/** GET /delivery/orders/active — every in-flight delivery (incl. awaiting response). */
export const getActiveDeliveries = async (req, res, next) => {
  try {
    const orders = await Order.find({
      type: "delivery",
      "delivery.status": { $in: ACTIVE_DELIVERY_STATUSES },
      status: { $nin: ["delivered", "cancelled"] },
    })
      .populate(ADMIN_DELIVERY_POPULATE)
      .sort({ "delivery.assignedAt": -1 });
    res.json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    next(error);
  }
};

/** GET /delivery/orders/completed — completed deliveries with fee split. */
export const getCompletedDeliveries = async (req, res, next) => {
  try {
    const { date } = req.query;
    const filter = { type: "delivery", status: "delivered" };
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      filter.actualDeliveryTime = { $gte: start, $lte: end };
    }
    const orders = await Order.find(filter)
      .populate(ADMIN_DELIVERY_POPULATE)
      .sort({ actualDeliveryTime: -1 })
      .limit(Math.min(parseInt(req.query.limit) || 100, 300));
    res.json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    next(error);
  }
};

/** GET /delivery/overview — dashboard stats block for Delivery Management. */
export const getDeliveryOverview = async (req, res, next) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const [
      totalPartners,
      pendingPartners,
      activePartners,
      availablePartners,
      suspendedPartners,
      ordersWaiting,
      activeDeliveries,
      completedToday,
      revenueAgg,
      earningAgg,
    ] = await Promise.all([
      DeliveryPartner.countDocuments({}),
      DeliveryPartner.countDocuments({ status: "pending" }),
      DeliveryPartner.countDocuments({ status: { $in: ["active", "busy"] } }),
      DeliveryPartner.countDocuments({ status: "active" }),
      DeliveryPartner.countDocuments({ status: "suspended" }),
      Order.countDocuments({
        type: "delivery",
        status: { $in: ["confirmed", "preparing", "ready"] },
        $or: [{ deliveryPartner: null }, { deliveryPartner: { $exists: false } }],
      }),
      Order.countDocuments({
        type: "delivery",
        "delivery.status": { $in: ACTIVE_DELIVERY_STATUSES },
        status: { $nin: ["delivered", "cancelled"] },
      }),
      Order.countDocuments({ type: "delivery", status: "delivered", actualDeliveryTime: { $gte: startOfDay, $lte: endOfDay } }),
      Order.aggregate([
        { $match: { type: "delivery", status: "delivered" } },
        { $group: { _id: null, total: { $sum: "$deliveryCharge" } } },
      ]),
      DeliveryEarning.aggregate([
        {
          $group: {
            _id: null,
            partnerTotal: { $sum: "$partnerEarning" },
            adminTotal: { $sum: "$adminEarning" },
            totalCharges: { $sum: "$totalDeliveryCharge" },
            deliveries: { $sum: 1 },
          },
        },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        partners: {
          total: totalPartners,
          pending: pendingPartners,
          active: activePartners,
          available: availablePartners,
          suspended: suspendedPartners,
        },
        ordersWaitingForAssignment: ordersWaiting,
        activeDeliveries,
        completedToday,
        totalDeliveryRevenue: revenueAgg[0]?.total || 0,
        partnerEarnings: earningAgg[0]?.partnerTotal || 0,
        adminEarnings: earningAgg[0]?.adminTotal || 0,
        totalDeliveryCharges: earningAgg[0]?.totalCharges || 0,
        completedDeliveries: earningAgg[0]?.deliveries || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ============================================================
// 9. Admin — earnings, payouts, settings
// ============================================================

/**
 * GET /delivery/earnings?partnerId=&status=&from=&to=&groupBy=partner|date
 * Defaults to a flat list; groupBy aggregates for the earnings page.
 */
export const listDeliveryEarnings = async (req, res, next) => {
  try {
    const { partnerId, status, from, to, groupBy } = req.query;
    const match = {};
    if (partnerId) match.partner = partnerId;
    if (status && ["pending", "paid"].includes(status)) match.status = status;
    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = new Date(from);
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        match.createdAt.$lte = end;
      }
    }

    if (groupBy === "date") {
      const rows = await DeliveryEarning.aggregate([
        { $match: match },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$completedAt" } },
            deliveries: { $sum: 1 },
            totalDeliveryCharges: { $sum: "$totalDeliveryCharge" },
            partnerEarnings: { $sum: "$partnerEarning" },
            adminEarnings: { $sum: "$adminEarning" },
          },
        },
        { $sort: { _id: -1 } },
      ]);
      return res.json({ success: true, count: rows.length, data: rows });
    }

    if (groupBy === "partner") {
      const rows = await DeliveryEarning.aggregate([
        { $match: match },
        {
          $group: {
            _id: "$partner",
            deliveries: { $sum: 1 },
            totalDeliveryCharges: { $sum: "$totalDeliveryCharge" },
            partnerEarnings: { $sum: "$partnerEarning" },
            adminEarnings: { $sum: "$adminEarning" },
            paid: { $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$partnerEarning", 0] } },
            pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, "$partnerEarning", 0] } },
          },
        },
        { $sort: { partnerEarnings: -1 } },
      ]);
      await DeliveryEarning.populate(rows, {
        path: "_id",
        select: "name email phone avatar",
      });
      return res.json({ success: true, count: rows.length, data: rows });
    }

    const [earnings, totalsAgg] = await Promise.all([
      DeliveryEarning.find(match)
        .populate("partner", "name email phone avatar")
        .sort({ completedAt: -1 })
        .limit(Math.min(parseInt(req.query.limit) || 100, 300)),
      DeliveryEarning.aggregate([
        { $match: match },
        {
          $group: {
            _id: null,
            totalDeliveryCharges: { $sum: "$totalDeliveryCharge" },
            partnerEarnings: { $sum: "$partnerEarning" },
            adminEarnings: { $sum: "$adminEarning" },
            deliveries: { $sum: 1 },
            paid: { $sum: { $cond: [{ $eq: ["$status", "paid"] }, "$partnerEarning", 0] } },
            pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, "$partnerEarning", 0] } },
          },
        },
      ]),
    ]);

    res.json({
      success: true,
      count: earnings.length,
      data: {
        summary: totalsAgg[0] || {
          totalDeliveryCharges: 0,
          partnerEarnings: 0,
          adminEarnings: 0,
          deliveries: 0,
          paid: 0,
          pending: 0,
        },
        earnings,
      },
    });
  } catch (error) {
    next(error);
  }
};

/** GET /delivery/payouts — payout history (optionally per partner). */
export const listPayouts = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.partnerId) filter.partner = req.query.partnerId;
    const payouts = await Payout.find(filter)
      .populate("partner", "name email phone avatar")
      .populate("createdBy", "name")
      .sort({ createdAt: -1 })
      .limit(Math.min(parseInt(req.query.limit) || 100, 300));

    const totals = await Payout.aggregate([
      { $match: filter },
      { $group: { _id: null, totalPaid: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]);

    res.json({
      success: true,
      count: payouts.length,
      data: { summary: totals[0] || { totalPaid: 0, count: 0 }, payouts },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /delivery/payouts {partnerId, amount?, markAll?} — settle earnings.
 * Earnings are consumed FIFO; the payout amount equals the sum actually paid.
 */
export const createPayout = async (req, res, next) => {
  try {
    const { partnerId, amount, markAll, method, reference, note } = req.body;
    if (!partnerId) {
      return res.status(400).json({ message: "partnerId is required" });
    }

    const pending = await DeliveryEarning.find({ partner: partnerId, status: "pending" })
      .sort({ completedAt: 1 });
    if (pending.length === 0) {
      return res.status(400).json({ message: "This partner has no pending earnings" });
    }

    const pendingTotal = pending.reduce((sum, e) => sum + e.partnerEarning, 0);
    const requested = Number(amount);
    if (!markAll && (!requested || requested < 1)) {
      return res.status(400).json({ message: "amount must be at least 1, or set markAll=true" });
    }
    if (!markAll && requested > pendingTotal) {
      return res.status(400).json({
        message: `Requested ₹${requested} exceeds pending earnings ₹${pendingTotal}`,
      });
    }

    // Consume earnings until the requested amount is covered
    let cumulative = 0;
    const selected = [];
    for (const earning of pending) {
      if (!markAll && cumulative >= requested) break;
      selected.push(earning);
      cumulative += earning.partnerEarning;
    }

    const payout = await Payout.create({
      partner: partnerId,
      amount: Math.round(cumulative),
      earnings: selected.map((e) => e._id),
      deliveryCount: selected.length,
      status: "completed",
      method: method || "manual",
      reference,
      note,
      createdBy: req.user._id,
    });

    await DeliveryEarning.updateMany(
      { _id: { $in: selected.map((e) => e._id) } },
      { status: "paid", paidAt: new Date(), payout: payout._id }
    );

    await createNotification(partnerId, {
      type: "delivery",
      title: "Payout Processed",
      message: `A payout of ₹${payout.amount} covering ${selected.length} deliveries has been processed.`,
      relatedId: payout._id,
    });

    res.status(201).json({
      message: `Payout of ₹${payout.amount} created for ${selected.length} deliveries`,
      data: payout,
    });
  } catch (error) {
    next(error);
  }
};

/** PATCH /delivery/admin/payouts/:id/mark-paid — mark a pending payout as paid. */
export const markPayoutPaid = async (req, res, next) => {
  try {
    const payout = await Payout.findById(req.params.id);
    if (!payout) {
      return res.status(404).json({ message: "Payout not found" });
    }
    if (payout.status === "completed") {
      return res.status(400).json({ message: "Payout is already marked as paid" });
    }
    payout.status = "completed";
    payout.processedAt = new Date();
    await payout.save();

    await DeliveryEarning.updateMany(
      { _id: { $in: payout.earnings } },
      { status: "paid", paidAt: new Date(), payout: payout._id }
    );

    await createNotification(payout.partner, {
      type: "delivery",
      title: "Payout Processed",
      message: `A payout of ₹${payout.amount} covering ${payout.deliveryCount} deliveries has been processed.`,
      relatedId: payout._id,
    });

    res.json({ message: "Payout marked as paid", data: payout });
  } catch (error) {
    next(error);
  }
};

/** GET /delivery/settings — current pricing configuration. */
export const getDeliverySettingsData = async (req, res, next) => {
  try {
    const settings = await getDeliverySettings();
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

/** PUT /delivery/settings — admin updates the pricing configuration. */
export const updateDeliverySettings = async (req, res, next) => {
  try {
    const settings = await getDeliverySettings();
    const allowed = [
      "baseFee",
      "perKmFee",
      "minFee",
      "maxFee",
      "partnerCommissionMode",
      "partnerFixedAmount",
      "partnerCommissionPercent",
      "platformCommissionPercent",
    ];

    for (const key of allowed) {
      if (req.body[key] !== undefined) settings[key] = req.body[key];
    }
    if (settings.minFee > settings.maxFee) {
      return res.status(400).json({ message: "minFee cannot be greater than maxFee" });
    }
    if (
      settings.partnerCommissionMode === "percentage" &&
      settings.partnerCommissionPercent + settings.platformCommissionPercent !== 100
    ) {
      return res.status(400).json({
        message: "partnerCommissionPercent + platformCommissionPercent must equal 100",
      });
    }
    await settings.save();

    res.json({ message: "Delivery settings updated", data: settings });
  } catch (error) {
    next(error);
  }
};

/** Alias: getPartnerDetail → getDeliveryPartnerDetail for consistency */
export const getPartner = getDeliveryPartnerDetail;


