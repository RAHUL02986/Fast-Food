import express from "express";
import {
  getMenuItems,
  getMenuItemById,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleAvailability,
  getCategories,
} from "../controllers/menuController.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = express.Router({ mergeParams: true });

// Public routes
router.get("/", getMenuItems);
router.get("/:id", getMenuItemById);
router.get("/restaurant/:restaurantId/categories", getCategories);

// Owner routes
router.post("/", authenticate, authorize(["owner"]), createMenuItem);
router.put("/:id", authenticate, authorize(["owner"]), updateMenuItem);
router.delete("/:id", authenticate, authorize(["owner"]), deleteMenuItem);
router.patch("/:id/availability", authenticate, authorize(["owner"]), toggleAvailability);

export default router;
