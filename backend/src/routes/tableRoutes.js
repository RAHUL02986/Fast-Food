import express from "express";
import {
  createTable,
  getTables,
  updateTable,
  deleteTable,
  setTableStatus,
  resolveTableByCode,
  getTableOrders,
} from "../controllers/tableController.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = express.Router();

// Public — scanned QR entry point and table order status
router.get("/qr/:code", resolveTableByCode);
router.get("/:tableId/orders", getTableOrders);

// Owner — table management
router.post("/", authenticate, authorize(["owner"]), createTable);
router.get("/", authenticate, authorize(["owner"]), getTables);
router.patch("/:id", authenticate, authorize(["owner"]), updateTable);
router.patch("/:id/status", authenticate, authorize(["owner"]), setTableStatus);
router.delete("/:id", authenticate, authorize(["owner"]), deleteTable);

export default router;