import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
  {
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant", required: true },
    // Stored uppercase — lookups always normalize the incoming code
    code: { type: String, required: true, uppercase: true, trim: true },
    description: String,
    discountType: { type: String, enum: ["percentage", "flat"], required: true },
    // percentage → % off, flat → ₹ off
    discountValue: { type: Number, required: true, min: 1 },
    // Minimum eligible-items subtotal required to use the coupon
    minOrderAmount: { type: Number, default: 0, min: 0 },
    // Cap for percentage coupons (ignored for flat)
    maxDiscount: { type: Number, min: 0 },
    // ---------- Product assignment ----------
    // true → coupon applies to the restaurant's entire menu.
    // false → only the menu items listed in applicableItems.
    applyToAllItems: { type: Boolean, default: false },
    applicableItems: [
      { type: mongoose.Schema.Types.ObjectId, ref: "MenuItem" },
    ],
    // ---------- Validity ----------
    validFrom: { type: Date, default: Date.now },
    validUntil: { type: Date, required: true },
    // Max total redemptions across all customers (0 / undefined = unlimited)
    usageLimit: { type: Number, default: 0, min: 0 },
    usedCount: { type: Number, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// A code is unique per restaurant (two restaurants can both run "WELCOME50")
couponSchema.index({ restaurant: 1, code: 1 }, { unique: true });
// Fast lookups of live coupons for a restaurant
couponSchema.index({ restaurant: 1, isActive: 1, validUntil: 1 });

export default mongoose.model("Coupon", couponSchema);