import express from "express";
import {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  rejectOrder,
  getDailySummary,
  cancelOrder,
  rateOrder,
  getAvailableDeliveryOrders,
  getMyDeliveryOrders,
  acceptDeliveryOrder,
  updateDeliveryLocation,
  markOrderDelivered,
  trackDelivery,
} from "../controllers/orderController.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = express.Router();

// Customer routes
router.post("/", authenticate, authorize(["customer"]), createOrder);
router.get("/", authenticate, getOrders);
router.get("/daily-summary", authenticate, authorize(["owner"]), getDailySummary);

// Delivery partner static paths MUST be registered BEFORE "/:id" so they aren't swallowed by it.
// (Legacy flow: customer-role users with the isDeliveryPartner flag; new partners
// use role "delivery_partner" and the dedicated /api/delivery endpoints.)
router.get("/delivery-partner/available", authenticate, authorize(["customer", "delivery_partner"]), getAvailableDeliveryOrders);
router.get("/delivery-partner/my", authenticate, authorize(["customer", "delivery_partner"]), getMyDeliveryOrders);

router.get("/:id", authenticate, getOrderById);
router.patch("/:id/cancel", authenticate, authorize(["customer"]), cancelOrder);
router.post("/:id/rate", authenticate, authorize(["customer"]), rateOrder);
router.get("/:id/track", authenticate, trackDelivery);

// Owner routes — order management is strictly owner-only (admin is read-only platform-wide)
router.patch("/:id/status", authenticate, authorize(["owner"]), updateOrderStatus);
router.patch("/:id/reject", authenticate, authorize(["owner"]), rejectOrder);

// Delivery partner action routes
router.patch("/:id/accept", authenticate, authorize(["customer", "delivery_partner"]), acceptDeliveryOrder);
router.patch("/:id/location", authenticate, authorize(["customer", "delivery_partner"]), updateDeliveryLocation);
router.patch("/:id/delivered", authenticate, authorize(["customer", "delivery_partner"]), markOrderDelivered);

export default router;
