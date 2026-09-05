import Booking from "../models/Booking.js";
import TableSlot from "../models/TableSlot.js";
import Restaurant from "../models/Restaurant.js";
import Table from "../models/Table.js";
import { createNotification } from "../utils/notificationService.js";

const generateBookingNumber = () => {
  return "BKG-" + Date.now() + Math.random().toString(36).substring(7).toUpperCase();
};

// Short unique code embedded in the booking QR shown at confirmation
const generateBookingCode = () =>
  "QF-" + Math.random().toString(36).substring(2, 8).toUpperCase();

// Best-effort: assign a free table that fits the party size
const assignTable = async (restaurantId, partySize) => {
  const table = await Table.findOne({
    restaurant: restaurantId,
    capacity: { $gte: partySize },
    status: { $ne: "inactive" },
    isActive: true,
  }).sort({ capacity: 1 });
  return table;
};

// Advance payment policy: minimum 2 guests; ₹200 covers 2 guests, ₹50 per additional guest
const MIN_PARTY_SIZE = 2;
const ADVANCE_BASE = 200;
const ADVANCE_PER_EXTRA_GUEST = 50;
// Guests get 50% of their advance back when they cancel
const REFUND_PERCENTAGE = 0.5;
const calculateAdvance = (partySize) =>
  ADVANCE_BASE + Math.max(0, partySize - MIN_PARTY_SIZE) * ADVANCE_PER_EXTRA_GUEST;

export const createBooking = async (req, res, next) => {
  try {
    const { slot, partySize, specialRequests, guestName, guestPhone, guestEmail, advancePaymentMethod } = req.body;

    if (!Number.isInteger(partySize) || partySize < MIN_PARTY_SIZE) {
      return res
        .status(400)
        .json({ message: `Table bookings require at least ${MIN_PARTY_SIZE} guests` });
    }

    // Advance is ALWAYS computed server-side — client-sent amounts are ignored
    const advanceAmount = calculateAdvance(partySize);

    const tableSlot = await TableSlot.findById(slot);
    if (!tableSlot) {
      return res.status(404).json({ message: "Slot not found" });
    }

    if (tableSlot.booked + partySize > tableSlot.capacity) {
      return res.status(400).json({ message: "Not enough capacity available" });
    }

    // Update slot
    tableSlot.booked += partySize;
    await tableSlot.save();

    const table = await assignTable(tableSlot.restaurant, partySize);

    const booking = new Booking({
      bookingNumber: generateBookingNumber(),
      bookingCode: generateBookingCode(),
      customer: req.user._id,
      restaurant: tableSlot.restaurant,
      slot,
      table: table?._id,
      partySize,
      specialRequests,
      guestName: guestName || req.user.name,
      guestPhone: guestPhone || req.user.phone,
      guestEmail: guestEmail || req.user.email,
      advanceAmount,
      advancePaymentMethod: advancePaymentMethod || "card",
      advanceStatus: "paid",
    });

    await booking.save();
    await booking.populate("restaurant slot table");

    // Notify restaurant
    const restaurant = await Restaurant.findById(tableSlot.restaurant);
    await createNotification(restaurant.owner, {
      type: "booking",
      title: "New Table Booking",
      message: `New booking for ${partySize} people on ${new Date(tableSlot.date).toLocaleDateString()} · advance ₹${advanceAmount} collected`,
      relatedId: booking._id,
    });

    // Notify customer
    await createNotification(req.user._id, {
      type: "booking",
      title: "Booking Confirmed",
      message: `Your table booking ${booking.bookingNumber} at ${restaurant.name} is confirmed! Advance of ₹${advanceAmount} paid via ${advancePaymentMethod || "card"}.`,
      relatedId: booking._id,
    });

    res.status(201).json({
      message: "Booking created successfully",
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

export const getBookings = async (req, res, next) => {
  try {
    const { status, restaurantId } = req.query;
    const filter = {};

<<<<<<< HEAD
    // "My Bookings" semantics: every caller sees the bookings they created.
    // Owners additionally manage their restaurant's bookings via restaurantId
    // (used by the owner dashboard /owner/bookings).
    if (restaurantId && req.user.role === "owner") {
      filter.restaurant = restaurantId;
    } else {
      filter.customer = req.user._id;
=======
    if (req.user.role === "customer") {
      filter.customer = req.user._id;
    } else if (req.user.role === "owner" && restaurantId) {
      filter.restaurant = restaurantId;
>>>>>>> 1ed4806eca017c48e5ffc19d534dbae1fea1c856
    }

    if (status) {
      filter.status = status;
    }

    const bookings = await Booking.find(filter)
      .populate("restaurant", "name location")
      .populate("slot")
      .populate("table", "name")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    next(error);
  }
};

export const getBookingById = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("restaurant")
      .populate("slot")
      .populate("table", "name qrCode")
      .populate("customer", "name phone email");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

<<<<<<< HEAD
    // Check permissions — a caller may view their own bookings (any role) or,
    // if owner, bookings for their restaurant.
    const isOwnBooking =
      booking.customer?._id?.toString?.() === req.user._id.toString() ||
      booking.customer?.toString?.() === req.user._id.toString();
    const isRestaurantOwner =
      req.user.role === "owner" &&
      (booking.restaurant?.owner?._id?.toString?.() || booking.restaurant?.owner?.toString?.()) ===
        req.user._id.toString();

    if (!isOwnBooking && !isRestaurantOwner) {
=======
    // Check permissions
    if (req.user.role === "customer" && booking.customer._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You don't have permission to view this booking" });
    }

    if (req.user.role === "owner" && booking.restaurant.owner.toString() !== req.user._id.toString()) {
>>>>>>> 1ed4806eca017c48e5ffc19d534dbae1fea1c856
      return res.status(403).json({ message: "You don't have permission to view this booking" });
    }

    res.json({
      success: true,
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

export const cancelBooking = async (req, res, next) => {
  try {
    const { reason } = req.body;

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only cancel your own bookings" });
    }

    if (booking.status !== "confirmed") {
      return res.status(400).json({ message: "This booking cannot be cancelled" });
    }

    // Release slot capacity
    const slot = await TableSlot.findById(booking.slot);
    if (slot) {
      slot.booked -= booking.partySize;
      await slot.save();
    }

    booking.status = "cancelled";
    booking.cancellationReason = reason;
    booking.cancellationTime = new Date();
    // Refund policy: 50% of the advance is refundable on cancellation
    if (booking.advanceAmount > 0) {
      booking.advanceStatus = "refunded";
      booking.refundAmount = Math.round(booking.advanceAmount * REFUND_PERCENTAGE);
    }
    await booking.save();

    // Notify restaurant
    const restaurant = await Restaurant.findById(booking.restaurant);
    await createNotification(restaurant.owner, {
      type: "booking",
      title: "Booking Cancelled",
      message: `Booking ${booking.bookingNumber} has been cancelled`,
      relatedId: booking._id,
    });

    // Notify customer about the advance refund (50% policy)
    if (booking.advanceAmount > 0) {
      await createNotification(req.user._id, {
        type: "booking",
        title: "Advance Refund Initiated",
        message: `A refund of ₹${booking.refundAmount} (50% of your ₹${booking.advanceAmount} advance) for booking ${booking.bookingNumber} will be returned to your ${booking.advancePaymentMethod}.`,
        relatedId: booking._id,
      });
    }

    res.json({
      message: "Booking cancelled successfully",
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

// Customer reschedules a confirmed booking to another slot
export const rescheduleBooking = async (req, res, next) => {
  try {
    const { slot: newSlotId } = req.body;

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only reschedule your own bookings" });
    }

    if (booking.status !== "confirmed") {
      return res.status(400).json({ message: "Only confirmed bookings can be rescheduled" });
    }

    const oldSlot = await TableSlot.findById(booking.slot);
    const newSlot = await TableSlot.findById(newSlotId);
    if (!newSlot) {
      return res.status(404).json({ message: "New slot not found" });
    }
    if (oldSlot && oldSlot._id.toString() === newSlot._id.toString()) {
      return res.status(400).json({ message: "Booking is already on that slot" });
    }
    if (newSlot.booked + booking.partySize > newSlot.capacity) {
      return res.status(400).json({ message: "Not enough capacity in the selected slot" });
    }

    // Release the old slot, take the new one
    if (oldSlot) {
      oldSlot.booked = Math.max(0, oldSlot.booked - booking.partySize);
      await oldSlot.save();
    }
    newSlot.booked += booking.partySize;
    await newSlot.save();

    // Re-assign a fitting table for the new slot's restaurant
    const table = await Table.findOne({
      restaurant: newSlot.restaurant,
      capacity: { $gte: booking.partySize },
      status: { $ne: "inactive" },
      isActive: true,
    }).sort({ capacity: 1 });

    booking.slot = newSlot._id;
    booking.table = table?._id;
    await booking.save();
    await booking.populate([{ path: "restaurant", select: "name location" }, "slot", { path: "table", select: "name" }]);

    const restaurant = await Restaurant.findById(booking.restaurant);
    await createNotification(restaurant.owner, {
      type: "booking",
      title: "Booking Rescheduled",
      message: `Booking ${booking.bookingNumber} was rescheduled to ${new Date(newSlot.date).toLocaleDateString()} ${newSlot.startTime}`,
      relatedId: booking._id,
    });

    res.json({ message: "Booking rescheduled", data: booking });
  } catch (error) {
    next(error);
  }
};

export const updateBookingStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    const validStatuses = ["confirmed", "cancelled", "completed", "no-show"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Verify owner permission
    const restaurant = await Restaurant.findOne({
      _id: booking.restaurant,
      owner: req.user._id,
    });

    if (!restaurant) {
      return res.status(403).json({ message: "You don't have permission to update this booking" });
    }

    booking.status = status;
    await booking.save();

    // Notify customer
    await createNotification(booking.customer, {
      type: "booking",
      title: `Booking ${status}`,
      message: `Your booking status has been updated to ${status}`,
      relatedId: booking._id,
    });

    res.json({
      message: "Booking status updated",
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

export const getAvailableSlots = async (req, res, next) => {
  try {
    const { restaurantId, date } = req.query;

    if (!date) {
      return res.status(400).json({ message: "Date parameter is required" });
    }

    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const slots = await TableSlot.find({
      restaurant: restaurantId,
      date: { $gte: startDate, $lte: endDate },
      isActive: true,
      $expr: { $lt: ["$booked", "$capacity"] },
    }).sort({ startTime: 1 });

    res.json({
      success: true,
      count: slots.length,
      data: slots,
    });
  } catch (error) {
    next(error);
  }
};
