import mongoose from "mongoose";

const menuItemSchema = new mongoose.Schema(
  {
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant", required: true },
    name: { type: String, required: true },
    description: String,
    price: { type: Number, required: true },
    originalPrice: Number,
    category: { type: String, required: true },
    image: String,
    isVeg: { type: Boolean, default: false },
    isSpicy: { type: Boolean, default: false },
    isAvailable: { type: Boolean, default: true },
    preparationTime: Number, // in minutes
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },
    quantity: { type: Number, default: 0 }, // For tracking quantity if needed
  },
  { timestamps: true }
);

menuItemSchema.index({ restaurant: 1, category: 1 });

export default mongoose.model("MenuItem", menuItemSchema);
