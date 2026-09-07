import Order from "../models/Order.js";
import DeliveryEarning from "../models/DeliveryEarning.js";
import DeliveryPartner from "../models/DeliveryPartner.js";
import { getDeliverySettings, computeFeeBreakdown } from "./deliveryFee.js";

/**
 * Shared delivery settlement — called from EVERY code path that marks a
 * delivery order as "delivered" (partner app endpoint, partner order
 * endpoint and the restaurant-owner status endpoint).
 *
 * 1. Splits the delivery charge between partner and platform (reusing the
 *    split stored on the order at assignment time when available).
 * 2. Creates the partner's DeliveryEarning record (feeds wallet + payouts).
 * 3. Bumps the partner's lifetime stats and syncs their busy/active status.
 *
 * Idempotent: when an earning already exists for the order nothing is
 * created and stats are NOT double-counted, so any endpoint can safely call
 * it even if the delivery was recorded through another path earlier.
 *
 * @param {Object} params
 * @param {Object} params.order  Delivered Order document (already saved).
 * @param {mongoose.ObjectId|String} params.partnerUserId  User _id of the delivery partner.
 * @returns {Promise<{earning: Object, created: boolean, fee: number, partnerEarning: number,
 *   adminEarning: number, stillBusy: number}>}
 */
export const settleDeliveryEarning = async ({ order, partnerUserId }) => {
  // Already settled elsewhere? Report the existing record without re-crediting.
  const existing = await DeliveryEarning.findOne({ order: order._id });
  if (existing) {
    return {
      earning: existing,
      created: false,
      fee: existing.totalDeliveryCharge,
      partnerEarning: existing.partnerEarning,
      adminEarning: existing.adminEarning,
      stillBusy: await countActiveDeliveries(partnerUserId),
    };
  }

  // ---------- fee split (prefer values stored on the order) ----------
  const settings = await getDeliverySettings();
  let fee = Number(order.delivery?.fee) || Number(order.deliveryCharge) || 0;
  let partnerEarning = Number(order.delivery?.partnerEarning);
  let adminEarning = Number(order.delivery?.adminEarning);
  if (!fee || isNaN(partnerEarning) || isNaN(adminEarning)) {
    const breakdown = await computeFeeBreakdown({
      settings,
      orderDeliveryCharge: order.deliveryCharge,
      distanceKm: order.delivery?.distanceKm ?? null,
    });
    if (!fee) fee = breakdown.fee;
    partnerEarning = breakdown.partnerEarning;
    adminEarning = breakdown.adminEarning;
  }

  // ---------- earning record (unique per order) ----------
  let earning;
  try {
    earning = await DeliveryEarning.create({
      partner: partnerUserId,
      order: order._id,
      orderNumber: order.orderNumber,
      totalDeliveryCharge: fee,
      partnerEarning,
      adminEarning,
      status: "pending",
      completedAt: order.actualDeliveryTime || undefined,
    });
  } catch (err) {
    // Lost a race against a concurrent settlement — unique index on `order`.
    if (err?.code === 11000) {
      earning = await DeliveryEarning.findOne({ order: order._id });
      return {
        earning,
        created: false,
        fee: earning?.totalDeliveryCharge ?? fee,
        partnerEarning: earning?.partnerEarning ?? partnerEarning,
        adminEarning: earning?.adminEarning ?? adminEarning,
        stillBusy: await countActiveDeliveries(partnerUserId),
      };
    }
    throw err;
  }

  // ---------- partner lifetime stats + busy/active status ----------
  const stillBusy = await countActiveDeliveries(partnerUserId);
  const profile = await DeliveryPartner.findOne({ user: partnerUserId });
  if (profile) {
    profile.totalDeliveries = (profile.totalDeliveries || 0) + 1;
    profile.completedDeliveries = (profile.completedDeliveries || 0) + 1;
    profile.totalEarnings = (profile.totalEarnings || 0) + partnerEarning;
    profile.status = stillBusy > 0 ? "busy" : "active";
    await profile.save();
  }

  return { earning, created: true, fee, partnerEarning, adminEarning, stillBusy };
};

/**
 * Statuses that mean "still working on it" across BOTH order flows:
 * - partner-app staged flow: assigned / accepted / reached_restaurant / picked_up
 * - simple order flow: placed / confirmed / preparing / ready
 * ("out_for_delivery" is shared by both.)
 */
const ACTIVE_DELIVERY_STATUSES = [
  "assigned",
  "accepted",
  "reached_restaurant",
  "picked_up",
  "out_for_delivery",
  "placed",
  "confirmed",
  "preparing",
  "ready",
];

/** How many undelivered delivery orders are still assigned to this partner. */
const countActiveDeliveries = (partnerUserId) =>
  Order.countDocuments({
    deliveryPartner: partnerUserId,
    status: { $in: ACTIVE_DELIVERY_STATUSES },
  });