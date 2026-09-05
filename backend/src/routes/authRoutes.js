import express from "express";
import { z } from "zod";
import {
  signup,
  login,
  getProfile,
  updateProfile,
  changePassword,
  verifyToken,
  requestOtp,
  verifyOtp,
} from "../controllers/authController.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { validateRequest } from "../middleware/validation.js";
import {
  loginLimiter,
  signupLimiter,
  otpRequestLimiter,
  otpVerifyLimiter,
} from "../middleware/rateLimit.js";

const router = express.Router();

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["customer", "owner", "admin"]).default("customer"),
  phone: z.string().optional(),
  invitationCode: z.string().optional(),
  isDeliveryPartner: z.boolean().optional(),
});

const loginSchema = z.object({
  email: z.string().min(1, "Email or phone is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const requestOtpSchema = z.object({
  identifier: z.string().min(3, "Enter your email or phone"),
});

const verifyOtpSchema = z.object({
  identifier: z.string().min(3, "Enter your email or phone"),
  otp: z.string().length(6, "OTP must be 6 digits"),
});

const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  avatar: z.string().optional(),
  addresses: z
    .array(
      z.object({
        label: z.string().optional(),
        line: z.string().min(1, "Address line is required"),
        city: z.string().optional(),
        zip: z.string().optional(),
        phone: z.string().optional(),
        isDefault: z.boolean().optional(),
      })
    )
    .optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

// Credential endpoints are rate-limited (brute-force protection)
router.post("/signup", signupLimiter, validateRequest(signupSchema), signup);
router.post("/login", loginLimiter, validateRequest(loginSchema), login);
router.post("/otp/request", otpRequestLimiter, validateRequest(requestOtpSchema), requestOtp);
router.post("/otp/verify", otpVerifyLimiter, validateRequest(verifyOtpSchema), verifyOtp);
router.get("/verify", authenticate, verifyToken);
router.get("/profile", authenticate, getProfile);
router.put("/profile", authenticate, validateRequest(updateProfileSchema), updateProfile);
router.post(
  "/change-password",
  authenticate,
  validateRequest(changePasswordSchema),
  changePassword
);

export default router;
