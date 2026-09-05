import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant" },
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    category: {
      type: String,
      enum: ["order", "food-quality", "delivery", "booking", "staff", "other"],
      default: "other",
    },
    subject: { type: String, required: true },
    description: { type: String, required: true },
    status: {
      type: String,
      enum: ["open", "reviewing", "resolved", "dismissed"],
      default: "open",
    },
    adminNotes: String,
  },
  { timestamps: true }
);

reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ customer: 1, createdAt: -1 });

export default mongoose.model("Report", reportSchema);