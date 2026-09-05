import mongoose from "mongoose";

const restaurantSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    description: String,
    cuisine: [String],
    location: String,
    city: String,
    latitude: Number,
    longitude: Number,
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    rejectionReason: String,
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },
    openingTime: String, // HH:MM format
    closingTime: String, // HH:MM format
    isOpen: { type: Boolean, default: true },
    deliveryTime: Number, // in minutes
    minOrderValue: Number,
    deliveryCharge: Number,
    photos: [String],
    banner: String,
    verified: { type: Boolean, default: false },
<<<<<<< HEAD
    // GeoJSON Point for geospatial queries (5km radius search)
    loc: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
      },
    },
=======
>>>>>>> 1ed4806eca017c48e5ffc19d534dbae1fea1c856
    documents: {
      licenseNumber: String,
      licenseExpiry: Date,
      gstin: String,
    },
    // Admin moderation: suspended restaurants are hidden from browse & can't take orders
    isActive: { type: Boolean, default: true },
    suspendedReason: String,
  },
  { timestamps: true }
);

// Index for search
restaurantSchema.index({ name: "text", cuisine: "text", city: "text" });
restaurantSchema.index({ city: 1, status: 1 });
<<<<<<< HEAD
// Geospatial index for location-based search (5km radius)
restaurantSchema.index({ loc: "2dsphere" });

// Keep `loc` in sync with latitude/longitude before saving
restaurantSchema.pre("save", function (next) {
  if (this.isModified("latitude") || this.isModified("longitude") || this.isNew) {
    if (this.latitude !== undefined && this.longitude !== undefined) {
      this.loc = {
        type: "Point",
        coordinates: [this.longitude, this.latitude],
      };
    }
  }
  next();
});
=======
>>>>>>> 1ed4806eca017c48e5ffc19d534dbae1fea1c856

export default mongoose.model("Restaurant", restaurantSchema);
