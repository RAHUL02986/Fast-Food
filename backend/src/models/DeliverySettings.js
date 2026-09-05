import mongoose from "mongoose";

/**
 * Platform-wide delivery pricing configuration (single document, key "delivery").
 * Controls how the customer-facing delivery fee is calculated and how it is
 * split between the delivery partner and the admin/platform.
 */
const deliverySettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: "delivery", unique: true, immutable: true },
    // Customer-facing delivery fee = baseFee + perKmFee × distance,
    // clamped between minFee and maxFee.
    baseFee: { type: Number, default: 30, min: 0 },
    perKmFee: { type: Number, default: 10, min: 0 },
    minFee: { type: Number, default: 20, min: 0 },
    maxFee: { type: Number, default: 200, min: 1 },
    // How the partner's cut of the fee is computed:
    //   fixed      — partnerFixedAmount per delivery
    //   percentage — partnerCommissionPercent % of the delivery fee
    //   distance   — perKmFee × distance (capped at the fee)
    partnerCommissionMode: {
      type: String,
      enum: ["fixed", "percentage", "distance"],
      default: "percentage",
    },
    partnerFixedAmount: { type: Number, default: 40, min: 0 },
    partnerCommissionPercent: { type: Number, default: 70, min: 0, max: 100 },
    // Remaining fee share automatically belongs to the admin/platform.
    platformCommissionPercent: { type: Number, default: 30, min: 0, max: 100 },
  },
  { timestamps: true }
);

export default mongoose.model("DeliverySettings", deliverySettingsSchema);