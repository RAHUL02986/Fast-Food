import express from "express";
import { z } from "zod";
import {
  registerDeliveryPartner,
  getMyPartnerProfile,
  updatePartnerProfile,
  setAvailability,
  updatePartnerLocation,
  getMyDeliveryRequests,
  getMyActiveDeliveries,
  getMyDeliveryHistory,
  acceptDeliveryRequest,
  rejectDeliveryRequest,
  markReachedRestaurant,
  markPickedUp,
  startDelivery,
  markOrderDeliveredByPartner,
  getMyEarnings,
  getMyWallet,
  getMyPayouts,
  listDeliveryPartners,
  getDeliveryPartnerDetail,
  approveDeliveryPartner,
  rejectDeliveryPartner,
  suspendDeliveryPartner,
  activateDeliveryPartner,
  getAvailableDeliveryPartners,
  assignDelivery,
  getUnassignedOrders,
  getActiveDeliveries,
  getCompletedDeliveries,
  getDeliveryOverview,
  listDeliveryEarnings,
  listPayouts,
  createPayout,
  markPayoutPaid,
  getDeliverySettingsData,
  updateDeliverySettings,
} from "../controllers/deliveryController.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validation.js";
import { signupLimiter } from "../middleware/rateLimit.js";

const router = express.Router();

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().min(6, "Phone number is required"),
  avatar: z.string().optional(),
  vehicleType: z.enum(["bike", "scooter", "car", "bicycle", "other"]).default("bike"),
  vehicleNumber: z.string().min(2, "Vehicle number is required"),
  address: z.string().min(4, "Address is required"),
  city: z.string().min(2, "City is required"),
  idDocument: z.string().optional(),
});
router.post("/register", signupLimiter, validateRequest(registerSchema), registerDeliveryPartner);

router.get("/me", authenticate, authorize(["delivery_partner"]), getMyPartnerProfile);
router.put("/profile", authenticate, authorize(["delivery_partner"]), updatePartnerProfile);
router.post("/availability", authenticate, authorize(["delivery_partner"]), setAvailability);
router.patch("/location", authenticate, authorize(["delivery_partner"]), updatePartnerLocation);

router.get("/requests", authenticate, authorize(["delivery_partner"]), getMyDeliveryRequests);
router.get("/active", authenticate, authorize(["delivery_partner"]), getMyActiveDeliveries);
router.get("/history", authenticate, authorize(["delivery_partner"]), getMyDeliveryHistory);
router.patch("/orders/:id/accept", authenticate, authorize(["delivery_partner"]), acceptDeliveryRequest);
router.patch("/orders/:id/reject", authenticate, authorize(["delivery_partner"]), rejectDeliveryRequest);
router.patch("/orders/:id/reached", authenticate, authorize(["delivery_partner"]), markReachedRestaurant);
router.patch("/orders/:id/picked-up", authenticate, authorize(["delivery_partner"]), markPickedUp);
router.patch("/orders/:id/start-delivery", authenticate, authorize(["delivery_partner"]), startDelivery);
router.patch("/orders/:id/delivered", authenticate, authorize(["delivery_partner"]), markOrderDeliveredByPartner);

router.get("/earnings", authenticate, authorize(["delivery_partner"]), getMyEarnings);
router.get("/wallet", authenticate, authorize(["delivery_partner"]), getMyWallet);
router.get("/earnings/payouts", authenticate, authorize(["delivery_partner"]), getMyPayouts);

router.get("/admin/overview", authenticate, authorize(["admin"]), getDeliveryOverview);
router.get("/admin/partners", authenticate, authorize(["admin"]), listDeliveryPartners);
router.get("/admin/partners/:id", authenticate, authorize(["admin"]), getDeliveryPartnerDetail);
router.patch("/admin/partners/:id/approve", authenticate, authorize(["admin"]), approveDeliveryPartner);
router.patch("/admin/partners/:id/reject", authenticate, authorize(["admin"]), rejectDeliveryPartner);
router.patch("/admin/partners/:id/suspend", authenticate, authorize(["admin"]), suspendDeliveryPartner);
router.patch("/admin/partners/:id/activate", authenticate, authorize(["admin"]), activateDeliveryPartner);

router.get("/admin/available-partners", authenticate, authorize(["admin"]), getAvailableDeliveryPartners);
router.post("/admin/assign", authenticate, authorize(["admin"]), assignDelivery);
router.get("/admin/orders/unassigned", authenticate, authorize(["admin"]), getUnassignedOrders);
router.get("/admin/orders/active", authenticate, authorize(["admin"]), getActiveDeliveries);
router.get("/admin/orders/completed", authenticate, authorize(["admin"]), getCompletedDeliveries);

router.get("/admin/earnings", authenticate, authorize(["admin"]), listDeliveryEarnings);
router.get("/admin/payouts", authenticate, authorize(["admin"]), listPayouts);
router.post("/admin/payouts", authenticate, authorize(["admin"]), createPayout);
router.patch("/admin/payouts/:id/mark-paid", authenticate, authorize(["admin"]), markPayoutPaid);
router.get("/admin/settings", authenticate, authorize(["admin"]), getDeliverySettingsData);
router.put("/admin/settings", authenticate, authorize(["admin"]), updateDeliverySettings);

export default router;
