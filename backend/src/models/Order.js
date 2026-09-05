import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    orderNumber: String,
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant", required: true },
    items: [
      {
        menuItem: { type: mongoose.Schema.Types.ObjectId, ref: "MenuItem" },
        quantity: Number,
        price: Number,
        specialInstructions: String,
      },
    ],
    subtotal: Number,
    deliveryCharge: Number,
    tax: Number,
    total: Number,
    paymentMethod: { type: String, enum: ["card", "wallet", "cash", "upi"], default: "card" },
    paymentStatus: { type: String, enum: ["pending", "completed", "failed"], default: "pending" },
    paymentId: String,
    // Order channel: delivery (online order) or dine-in (ordered from a table)
    type: { type: String, enum: ["delivery", "dine-in"], default: "delivery" },
    table: { type: mongoose.Schema.Types.ObjectId, ref: "Table" },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
    deliveryAddress: {
      street: String,
      city: String,
      state: String,
      zip: String,
      latitude: Number,
      longitude: Number,
    },
    specialInstructions: String,
    status: {
      type: String,
      enum: [
        "placed",
        "confirmed",
        "preparing",
        "ready",
        "out_for_delivery",
        "delivered",
        "served", // dine-in final status
        "cancelled",
      ],
      default: "placed",
    },
    statusUpdates: [
      {
        status: String,
        timestamp: { type: Date, default: Date.now },
        note: String,
      },
    ],
    estimatedDeliveryTime: Date,
    actualDeliveryTime: Date,
    deliveryPartner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    // ---------- Delivery lifecycle ----------
    // Granular delivery stage (the 10-step flow lives here; the top-level
    // `status` keeps its kitchen-facing values so existing UI keeps working).
    delivery: {
      status: {
        type: String,
        enum: [
          "unassigned",
          "assigned",
          "accepted",
          "rejected",
          "reached_restaurant",
          "picked_up",
          "out_for_delivery",
          "delivered",
        ],
        default: "unassigned",
      },
      assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      assignedAt: Date,
      acceptedAt: Date,
      rejectedAt: Date,
      rejectionReason: String,
      pickupStartedAt: Date,
      reachedRestaurantAt: Date,
      pickedUpAt: Date,
      deliveredAt: Date,
      // Fee split computed at assignment time (₹)
      fee: Number, // customer delivery charge
      partnerEarning: Number,
      adminEarning: Number,
      distanceKm: Number, // restaurant → customer
      trackingEnabled: { type: Boolean, default: false },
    },
    // Complete record of every assignment attempt on this order
    assignmentHistory: [
      {
        partner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        assignedAt: { type: Date, default: Date.now },
        outcome: {
          type: String,
          enum: ["assigned", "accepted", "rejected", "completed"],
          default: "assigned",
        },
        reason: String,
      },
    ],
    rating: Number,
    review: String,
    cancelReason: String,
  },
  { timestamps: true }
);

orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ restaurant: 1, status: 1 });
orderSchema.index({ restaurant: 1, type: 1, createdAt: -1 });
// Delivery dashboards filter by partner + delivery stage constantly
orderSchema.index({ deliveryPartner: 1, "delivery.status": 1 });
orderSchema.index({ status: 1, type: 1, "delivery.status": 1 });

export default mongoose.model("Order", orderSchema);
