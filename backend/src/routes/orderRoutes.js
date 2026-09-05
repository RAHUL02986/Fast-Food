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
<<<<<<< HEAD
  getAvailableDeliveryOrders,
  getMyDeliveryOrders,
  acceptDeliveryOrder,
  updateDeliveryLocation,
  markOrderDelivered,
  trackDelivery,
=======
>>>>>>> 1ed4806eca017c48e5ffc19d534dbae1fea1c856
} from "../controllers/orderController.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = express.Router();

// Customer routes
router.post("/", authenticate, authorize(["customer"]), createOrder);
router.get("/", authenticate, getOrders);
router.get("/daily-summary", authenticate, authorize(["owner"]), getDailySummary);
<<<<<<< HEAD

// Delivery partner static paths MUST be registered BEFORE "/:id" so they aren't swallowed by it.
// (Legacy flow: customer-role users with the isDeliveryPartner flag; new partners
// use role "delivery_partner" and the dedicated /api/delivery endpoints.)
router.get("/delivery-partner/available", authenticate, authorize(["customer", "delivery_partner"]), getAvailableDeliveryOrders);
router.get("/delivery-partner/my", authenticate, authorize(["customer", "delivery_partner"]), getMyDeliveryOrders);

router.get("/:id", authenticate, getOrderById);
router.patch("/:id/cancel", authenticate, authorize(["customer"]), cancelOrder);
router.post("/:id/rate", authenticate, authorize(["customer"]), rateOrder);
router.get("/:id/track", authenticate, trackDelivery);
=======
router.get("/:id", authenticate, getOrderById);
router.patch("/:id/cancel", authenticate, authorize(["customer"]), cancelOrder);
router.post("/:id/rate", authenticate, authorize(["customer"]), rateOrder);
>>>>>>> 1ed4806eca017c48e5ffc19d534dbae1fea1c856

// Owner routes — order management is strictly owner-only (admin is read-only platform-wide)
router.patch("/:id/status", authenticate, authorize(["owner"]), updateOrderStatus);
router.patch("/:id/reject", authenticate, authorize(["owner"]), rejectOrder);

<<<<<<< HEAD
// Delivery partner action routes
router.patch("/:id/accept", authenticate, authorize(["customer", "delivery_partner"]), acceptDeliveryOrder);
router.patch("/:id/location", authenticate, authorize(["customer", "delivery_partner"]), updateDeliveryLocation);
router.patch("/:id/delivered", authenticate, authorize(["customer", "delivery_partner"]), markOrderDelivered);

=======
>>>>>>> 1ed4806eca017c48e5ffc19d534dbae1fea1c856
export default router;
