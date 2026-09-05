import mongoose from "mongoose";

/**
 * One earnings record per completed delivery — created automatically when a
 * delivery partner marks an order delivered. Splits the delivery charge
 * between the partner and the platform and feeds the wallet/payout system.
 */
const deliveryEarningSchema = new mongoose.Schema(
  {
    partner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      unique: true,
    },
    orderNumber: String,
    totalDeliveryCharge: { type: Number, required: true, min: 0 },
    partnerEarning: { type: Number, required: true, min: 0 },
    adminEarning: { type: Number, required: true, min: 0 },
    // pending → paid when the admin issues a payout covering it
    status: {
      type: String,
      enum: ["pending", "paid"],
      default: "pending",
      index: true,
    },
    payout: { type: mongoose.Schema.Types.ObjectId, ref: "Payout" },
    paidAt: Date,
    completedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

deliveryEarningSchema.index({ partner: 1, status: 1 });
deliveryEarningSchema.index({ partner: 1, createdAt: -1 });

export default mongoose.model("DeliveryEarning", deliveryEarningSchema);