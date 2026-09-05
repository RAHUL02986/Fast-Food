import express from "express";
import { createSlots, getSlots, deleteSlot } from "../controllers/slotController.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = express.Router();

// Owner — slot management
router.post("/", authenticate, authorize(["owner"]), createSlots);
router.get("/", authenticate, authorize(["owner"]), getSlots);
router.delete("/:id", authenticate, authorize(["owner"]), deleteSlot);

export default router;