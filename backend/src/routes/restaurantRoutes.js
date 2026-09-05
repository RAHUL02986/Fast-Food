import express from "express";
import {
  getAllRestaurants,
  getNearbyRestaurants,
  getRestaurantById,
  createRestaurant,
  updateRestaurant,
  getOwnerRestaurant,
  getPendingRestaurants,
  approveRestaurant,
  rejectRestaurant,
  getAllRestaurantsAdmin,
} from "../controllers/restaurantController.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = express.Router();

// Public routes
router.get("/", getAllRestaurants);
router.get("/nearby", getNearbyRestaurants);
router.get("/:id", getRestaurantById);

// Owner routes
router.post("/", authenticate, authorize(["owner"]), createRestaurant);
router.put("/:id", authenticate, authorize(["owner", "admin"]), updateRestaurant);
router.get("/owner/my-restaurant", authenticate, authorize(["owner"]), getOwnerRestaurant);

// Admin routes
router.get("/pending/list", authenticate, authorize(["admin"]), getPendingRestaurants);
router.patch("/:id/approve", authenticate, authorize(["admin"]), approveRestaurant);
router.patch("/:id/reject", authenticate, authorize(["admin"]), rejectRestaurant);
router.get("/admin/all", authenticate, authorize(["admin"]), getAllRestaurantsAdmin);

export default router;
