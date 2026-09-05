import express from "express";
import {
  getAdminDashboard,
  getRestaurantAnalytics,
  getOrderAnalytics,
  getBookingAnalytics,
} from "../controllers/analyticsController.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = express.Router();

// Admin routes
router.get("/dashboard", authenticate, authorize(["admin"]), getAdminDashboard);
router.get("/orders", authenticate, authorize(["admin"]), getOrderAnalytics);
router.get("/bookings", authenticate, authorize(["admin"]), getBookingAnalytics);

// Owner routes
router.get("/restaurant/:restaurantId", authenticate, authorize(["owner"]), getRestaurantAnalytics);

export default router;
