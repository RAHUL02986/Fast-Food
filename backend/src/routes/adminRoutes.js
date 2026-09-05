import express from "express";
import {
  getCustomers,
  setUserActive,
  setRestaurantActive,
  getAllBookingsAdmin,
  getReports,
  updateReportStatus,
  createReport,
<<<<<<< HEAD
  generateAdminInvite,
  resetUserPassword } from "../controllers/adminController.js";
=======
} from "../controllers/adminController.js";
>>>>>>> 1ed4806eca017c48e5ffc19d534dbae1fea1c856
import { authenticate, authorize } from "../middleware/auth.js";

const router = express.Router();

// Customer — file a report/complaint
router.post("/reports", authenticate, authorize(["customer"]), createReport);

<<<<<<< HEAD
// Admin — invitation issuance + oversight + moderation
router.post("/invites/generate", authenticate, authorize(["admin"]), generateAdminInvite);
=======
// Admin — read-only oversight + moderation (never touches owner menu/order data)
>>>>>>> 1ed4806eca017c48e5ffc19d534dbae1fea1c856
router.get("/customers", authenticate, authorize(["admin"]), getCustomers);
router.get("/bookings", authenticate, authorize(["admin"]), getAllBookingsAdmin);
router.patch("/customers/:id/active", authenticate, authorize(["admin"]), setUserActive);
router.patch("/restaurants/:id/active", authenticate, authorize(["admin"]), setRestaurantActive);
router.get("/reports", authenticate, authorize(["admin"]), getReports);
router.patch("/reports/:id", authenticate, authorize(["admin"]), updateReportStatus);

<<<<<<< HEAD
// Admin sets a NEW password for a user (never reveals existing ones)
router.patch("/users/:id/reset-password", authenticate, authorize(["admin"]), resetUserPassword);

=======
>>>>>>> 1ed4806eca017c48e5ffc19d534dbae1fea1c856
export default router;