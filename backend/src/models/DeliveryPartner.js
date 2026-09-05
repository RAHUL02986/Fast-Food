import mongoose from "mongoose";

/**
 * Delivery Partner profile — one-to-one with a User (role: "delivery_partner").
 * The User holds auth identity; this document holds partner-specific data:
 * vehicle, approval state, availability and lifetime stats.
 */
const deliveryPartnerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    // Vehicle details collected at registration
    vehicleType: {
      type: String,
      enum: ["bike", "scooter", "car", "bicycle", "other"],
      default: "bike",
    },
    vehicleNumber: { type: String, trim: true },
    address: String,
    city: String,
    // Optional identity/verification document (uploaded image URL)
    idDocument: String,
    // Lifecycle: pending → approved → active/busy/offline; suspended/rejected are terminal
    status: {
      type: String,
      enum: ["pending", "approved", "active", "busy", "offline", "suspended", "rejected"],
      default: "pending",
    },
    rejectionReason: String,
    suspendedReason: String,
    approvedAt: Date,
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    // Partner consent — live tracking only runs when this is true
    locationPermission: { type: Boolean, default: false },
    // Lifetime stats (maintained by the delivery controller)
    totalDeliveries: { type: Number, default: 0 },
    completedDeliveries: { type: Number, default: 0 },
    cancelledDeliveries: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    lastActiveAt: Date,
  },
  { timestamps: true }
);

deliveryPartnerSchema.index({ status: 1, createdAt: -1 });
deliveryPartnerSchema.index({ city: 1 });

export default mongoose.model("DeliveryPartner", deliveryPartnerSchema);