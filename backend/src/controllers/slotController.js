import TableSlot from "../models/TableSlot.js";
import Restaurant from "../models/Restaurant.js";

// ---------- Owner: slot management ----------
export const createSlots = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findOne({ owner: req.user._id });
    if (!restaurant) {
      return res.status(404).json({ message: "No restaurant found for this owner" });
    }

    const { date, slots } = req.body; // slots: [{ startTime, endTime, capacity, table? }]
    if (!Array.isArray(slots) || slots.length === 0) {
      return res.status(400).json({ message: "At least one slot is required" });
    }

    const start = new Date(date);
    start.setHours(0, 0, 0, 0);

    const docs = slots.map((s) => ({
      restaurant: restaurant._id,
      table: s.table || undefined,
      date: start,
      startTime: s.startTime,
      endTime: s.endTime,
      capacity: s.capacity,
      booked: 0,
    }));

    const created = await TableSlot.insertMany(docs);
    res.status(201).json({ message: `${created.length} slot(s) created`, data: created });
  } catch (error) {
    next(error);
  }
};

export const getSlots = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findOne({ owner: req.user._id });
    if (!restaurant) {
      return res.status(404).json({ message: "No restaurant found for this owner" });
    }

    const filter = { restaurant: restaurant._id };
    if (req.query.date) {
      const start = new Date(req.query.date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(req.query.date);
      end.setHours(23, 59, 59, 999);
      filter.date = { $gte: start, $lte: end };
    }

    const slots = await TableSlot.find(filter)
      .populate("table", "name")
      .sort({ date: 1, startTime: 1 });

    res.json({ success: true, count: slots.length, data: slots });
  } catch (error) {
    next(error);
  }
};

export const deleteSlot = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findOne({ owner: req.user._id });
    if (!restaurant) {
      return res.status(404).json({ message: "No restaurant found for this owner" });
    }

    const slot = await TableSlot.findOne({ _id: req.params.id, restaurant: restaurant._id });
    if (!slot) {
      return res.status(404).json({ message: "Slot not found" });
    }
    if (slot.booked > 0) {
      return res.status(400).json({ message: "Cannot delete a slot that already has bookings" });
    }

    await slot.deleteOne();
    res.json({ message: "Slot deleted" });
  } catch (error) {
    next(error);
  }
};