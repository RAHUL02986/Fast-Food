import mongoose from "mongoose";

const tableSlotSchema = new mongoose.Schema(
  {
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant", required: true },
    table: { type: mongoose.Schema.Types.ObjectId, ref: "Table" }, // optional linked table
    date: { type: Date, required: true },
    startTime: String, // HH:MM format
    endTime: String, // HH:MM format
    capacity: { type: Number, required: true },
    booked: { type: Number, default: 0 },
    price: Number, // Price per slot if applicable
    isActive: { type: Boolean, default: true },
    description: String,
  },
  { timestamps: true }
);

tableSlotSchema.index({ restaurant: 1, date: 1 });
tableSlotSchema.index({ date: 1, isActive: 1 });

export default mongoose.model("TableSlot", tableSlotSchema);
