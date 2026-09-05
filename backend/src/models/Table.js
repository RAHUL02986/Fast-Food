import mongoose from "mongoose";

const tableSchema = new mongoose.Schema(
  {
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant", required: true },
    name: { type: String, required: true }, // e.g. "T1", "Terrace 2"
    capacity: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ["free", "occupied", "reserved", "inactive"],
      default: "free",
    },
    // QR payload scanned at the table → resolves to this table
    qrCode: { type: String, unique: true, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

tableSchema.index({ restaurant: 1, name: 1 }, { unique: true });

export default mongoose.model("Table", tableSchema);