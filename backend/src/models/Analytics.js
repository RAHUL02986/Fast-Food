import mongoose from "mongoose";

const analyticsSchema = new mongoose.Schema(
  {
    date: { type: Date, default: Date.now },
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant" },
    ordersCount: { type: Number, default: 0 },
    bookingsCount: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    cancelledOrders: { type: Number, default: 0 },
    totalCustomers: { type: Number, default: 0 },
    averageOrderValue: Number,
    topMenuItems: [
      {
        menuItem: mongoose.Schema.Types.ObjectId,
        count: Number,
        revenue: Number,
      },
    ],
  },
  { timestamps: true }
);

analyticsSchema.index({ restaurant: 1, date: -1 });

export default mongoose.model("Analytics", analyticsSchema);
