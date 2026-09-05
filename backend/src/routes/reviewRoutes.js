import express from "express";
import {
  createReview,
  getReviews,
  getFeaturedReviews,
  updateReview,
  deleteReview,
  markHelpful,
} from "../controllers/reviewController.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = express.Router();

// Public routes
router.get("/", getReviews);
// Public social-proof feed for the homepage slider
router.get("/featured", getFeaturedReviews);

// Customer routes
router.post("/", authenticate, authorize(["customer"]), createReview);
router.put("/:id", authenticate, authorize(["customer"]), updateReview);
router.delete("/:id", authenticate, authorize(["customer"]), deleteReview);
router.patch("/:id/helpful", authenticate, markHelpful);

export default router;
