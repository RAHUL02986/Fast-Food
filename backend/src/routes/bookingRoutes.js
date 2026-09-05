import express from "express";
import {
  createBooking,
  getBookings,
  getBookingById,
  cancelBooking,
  rescheduleBooking,
  updateBookingStatus,
  getAvailableSlots,
} from "../controllers/bookingController.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validation.js";
import { z } from "zod";

const router = express.Router();

const createBookingSchema = z.object({
  slot: z.string().min(1, "Slot is required"),
  restaurant: z.string().optional(),
  partySize: z
    .number({ invalid_type_error: "Party size must be a number" })
    .int("Party size must be a whole number")
    .min(2, "Table bookings require at least 2 guests"),
  guestName: z.string().optional(),
  guestPhone: z.string().optional(),
  guestEmail: z.string().optional(),
  specialRequests: z.string().optional(),
  advancePaymentMethod: z.enum(["card", "upi", "wallet"]).default("card"),
});

<<<<<<< HEAD
// Booking creation & self-service — any authenticated user can book a table.
// The booking is tied to the caller (customer: req.user._id); cancel/reschedule
// are ownership-checked inside the controller, so no role gate is needed here.
// Owner-only status management stays below.
router.post("/", authenticate, validateRequest(createBookingSchema), createBooking);
router.get("/", authenticate, getBookings);
router.get("/available-slots", getAvailableSlots);
router.get("/:id", authenticate, getBookingById);
router.patch("/:id/cancel", authenticate, cancelBooking);
router.patch("/:id/reschedule", authenticate, rescheduleBooking);
=======
// Customer routes
router.post("/", authenticate, authorize(["customer"]), validateRequest(createBookingSchema), createBooking);
router.get("/", authenticate, getBookings);
router.get("/available-slots", getAvailableSlots);
router.get("/:id", authenticate, getBookingById);
router.patch("/:id/cancel", authenticate, authorize(["customer"]), cancelBooking);
router.patch("/:id/reschedule", authenticate, authorize(["customer"]), rescheduleBooking);
>>>>>>> 1ed4806eca017c48e5ffc19d534dbae1fea1c856

// Owner routes
router.patch("/:id/status", authenticate, authorize(["owner"]), updateBookingStatus);

export default router;
