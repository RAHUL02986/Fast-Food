import mongoose from "mongoose";

/**
 * A payout settles a batch of a partner's pending earnings. Created by the
 * admin; the covered DeliveryEarning records are marked paid in one atomic
 * update so the wallet balances stay consistent.
 */
const payoutSchema = new mongoose.Schema(
  {
    partner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 1 },
    earnings: [
      { type: mongoose.Schema.Types.ObjectId, ref: "DeliveryEarning" },
    ],
    deliveryCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["pending", "completed"],
      default: "completed",
    },
    method: { type: String, default: "manual" },
    reference: String,
    note: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    processedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

payoutSchema.index({ partner: 1, createdAt: -1 });

export default mongoose.model("Payout", payoutSchema);