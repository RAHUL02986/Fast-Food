import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["order", "booking", "restaurant", "promo", "system", "delivery"],
      required: true,
    },
    title: String,
    message: String,
    data: mongoose.Schema.Types.Mixed, // Flexible data structure
    read: { type: Boolean, default: false },
    readAt: Date,
    relatedId: mongoose.Schema.Types.ObjectId, // Related order/booking/restaurant ID
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, read: 1 });

export default mongoose.model("Notification", notificationSchema);
