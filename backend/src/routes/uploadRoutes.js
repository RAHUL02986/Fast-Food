import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { uploadImage } from "../controllers/uploadController.js";

const router = Router();

// Authenticated image upload — accepts { dataUrl: "data:image/png;base64,..." }
router.post("/", authenticate, uploadImage);

export default router;
