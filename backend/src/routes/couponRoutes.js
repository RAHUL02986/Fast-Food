import express from "express";
import {
  createCoupon,
  getCoupons,
  updateCoupon,
  deleteCoupon,
  toggleCouponStatus,
  validateCoupon,
} from "../controllers/couponController.js";
import { authenticate, authorize, optionalAuth } from "../middleware/auth.js";

const router = express.Router({ mergeParams: true });

// Public routes (with optional auth — owners see all coupons, public sees only active)
router.get("/", optionalAuth, getCoupons);
router.post("/validate", validateCoupon);

// Owner routes
router.post("/", authenticate, authorize(["owner"]), createCoupon);
router.put("/:id", authenticate, authorize(["owner"]), updateCoupon);
router.delete("/:id", authenticate, authorize(["owner"]), deleteCoupon);
router.patch("/:id/status", authenticate, authorize(["owner"]), toggleCouponStatus);

export default router;