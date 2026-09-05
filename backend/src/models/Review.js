import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant" },
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    menuItem: { type: mongoose.Schema.Types.ObjectId, ref: "MenuItem" },
    type: { type: String, enum: ["restaurant", "food", "delivery"], required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: String,
    photos: [String],
    likes: { type: Number, default: 0 },
    helpful: { type: Boolean, default: false },
  },
  { timestamps: true }
);

reviewSchema.index({ restaurant: 1, createdAt: -1 });
reviewSchema.index({ menuItem: 1, createdAt: -1 });

export default mongoose.model("Review", reviewSchema);
