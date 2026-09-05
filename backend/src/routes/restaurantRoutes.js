import express from "express";
import {
  getAllRestaurants,
<<<<<<< HEAD
  getNearbyRestaurants,
=======
>>>>>>> 1ed4806eca017c48e5ffc19d534dbae1fea1c856
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
<<<<<<< HEAD
router.get("/nearby", getNearbyRestaurants);
=======
>>>>>>> 1ed4806eca017c48e5ffc19d534dbae1fea1c856
router.get("/:id", getRestaurantById);

// Owner routes
router.post("/", authenticate, authorize(["owner"]), createRestaurant);
<<<<<<< HEAD
router.put("/:id", authenticate, authorize(["owner", "admin"]), updateRestaurant);
=======
router.put("/:id", authenticate, authorize(["owner"]), updateRestaurant);
>>>>>>> 1ed4806eca017c48e5ffc19d534dbae1fea1c856
router.get("/owner/my-restaurant", authenticate, authorize(["owner"]), getOwnerRestaurant);

// Admin routes
router.get("/pending/list", authenticate, authorize(["admin"]), getPendingRestaurants);
router.patch("/:id/approve", authenticate, authorize(["admin"]), approveRestaurant);
router.patch("/:id/reject", authenticate, authorize(["admin"]), rejectRestaurant);
router.get("/admin/all", authenticate, authorize(["admin"]), getAllRestaurantsAdmin);

export default router;
