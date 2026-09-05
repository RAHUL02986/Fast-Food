import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    bookingNumber: String,
    // Short unique code encoded in the booking QR
    bookingCode: { type: String, unique: true, sparse: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant", required: true },
    slot: { type: mongoose.Schema.Types.ObjectId, ref: "TableSlot", required: true },
    table: { type: mongoose.Schema.Types.ObjectId, ref: "Table" },
    partySize: { type: Number, required: true },
    specialRequests: String,
    status: {
      type: String,
      enum: ["confirmed", "cancelled", "completed", "no-show"],
      default: "confirmed",
    },
    guestName: String,
    guestPhone: String,
    guestEmail: String,
    cancellationReason: String,
    cancellationTime: Date,
    reminder: { type: Boolean, default: false },
    reminderSent: { type: Boolean, default: false },
    // Advance payment collected at booking time (server-computed, never trusted from client):
    // ₹200 base covering up to 2 guests + ₹50 per additional guest
    advanceAmount: { type: Number, default: 0 },
    advancePaymentMethod: { type: String, enum: ["card", "upi", "wallet"], default: "card" },
    advanceStatus: { type: String, enum: ["paid", "refunded"], default: "paid" },
    // 50% of the advance is refundable on cancellation (policy in bookingController)
    refundAmount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

bookingSchema.index({ customer: 1, status: 1 });
bookingSchema.index({ restaurant: 1, createdAt: -1 });

export default mongoose.model("Booking", bookingSchema);
