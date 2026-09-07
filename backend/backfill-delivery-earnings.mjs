// One-off maintenance script — backfills DeliveryEarning records for delivered
// orders that were completed through code paths which predated the shared
// settlement helper (e.g. PATCH /orders/:id/delivered or PATCH /orders/:id/status),
// then rebuilds every partner's lifetime counters from DB truth.
//
// Safe to re-run: settlement is idempotent (pre-check + unique index on
// DeliveryEarning.order) and the stats pass RECOMPUTES counters instead of
// incrementing them, healing any double-increments from earlier runs.
import "dotenv/config";
import mongoose from "mongoose";
import Order from "./src/models/Order.js";
import DeliveryPartner from "./src/models/DeliveryPartner.js";
import DeliveryEarning from "./src/models/DeliveryEarning.js";
import User from "./src/models/User.js"; // registers the "User" model (needed by populate)
import { settleDeliveryEarning } from "./src/utils/deliverySettlement.js";

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  // ---- pass 1: settle any delivered order that is missing its earning ----
  const orders = await Order.find({
    status: "delivered",
    deliveryPartner: { $exists: true, $ne: null },
  }).select("_id orderNumber deliveryPartner deliveryCharge delivery actualDeliveryTime");

  console.log(`Delivered orders with an assigned partner: ${orders.length}`);

  let created = 0;
  let skipped = 0;
  for (const order of orders) {
    const result = await settleDeliveryEarning({
      order,
      partnerUserId: order.deliveryPartner,
    });
    if (result.created) {
      created++;
      console.log(
        `  + created earning for ${order.orderNumber}: partner ₹${result.partnerEarning} / admin ₹${result.adminEarning}`
      );
    } else {
      skipped++;
    }
  }
  console.log(`Settlement — created: ${created}, already settled: ${skipped}`);

  // ---- pass 2: rebuild lifetime counters from the earnings collection ----
  const partners = await DeliveryPartner.find().populate("user", "name");
  let rebuilt = 0;
  for (const profile of partners) {
    const userId = profile.user?._id ?? profile.user;
    if (!userId) continue;

    const [truth] = await DeliveryEarning.aggregate([
      { $match: { partner: userId } },
      {
        $group: {
          _id: null,
          deliveries: { $sum: 1 },
          totalEarnings: { $sum: "$partnerEarning" },
        },
      },
    ]);
    const stats = truth ?? { deliveries: 0, totalEarnings: 0 };

    const before = {
      totalDeliveries: profile.totalDeliveries,
      completedDeliveries: profile.completedDeliveries,
      totalEarnings: profile.totalEarnings,
    };
    profile.totalDeliveries = stats.deliveries;
    profile.completedDeliveries = stats.deliveries;
    profile.totalEarnings = stats.totalEarnings;

    const changed =
      before.totalDeliveries !== profile.totalDeliveries ||
      before.completedDeliveries !== profile.completedDeliveries ||
      before.totalEarnings !== profile.totalEarnings;

    if (changed) {
      await profile.save();
      rebuilt++;
      console.log(
        `  ~ rebuilt stats for ${profile.user?.name ?? profile._id}:`,
        JSON.stringify(before),
        "→",
        JSON.stringify({
          totalDeliveries: profile.totalDeliveries,
          completedDeliveries: profile.completedDeliveries,
          totalEarnings: profile.totalEarnings,
        })
      );
    }
  }
  console.log(`Stats rebuild — ${rebuilt} partner profile(s) corrected.`);

  await mongoose.disconnect();
  process.exit(0);
};
run().catch(async (err) => {
  console.error("CRASH:", err.message);
  await mongoose.disconnect();
  process.exit(1);
});