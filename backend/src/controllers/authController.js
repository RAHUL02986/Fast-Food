import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import AdminInvite from "../models/AdminInvite.js";
import { createNotification } from "../utils/notificationService.js";

export const signup = async (req, res, next) => {
  try {
    const { name, email, password, role = "customer", invitationCode, phone, isDeliveryPartner } = req.body;

    if (role === "admin") {
      const invite = await AdminInvite.findOne({
        code: String(invitationCode || "").trim().toUpperCase(),
        isActive: true,
        expiresAt: { $gt: new Date() },
        usedBy: null,
      });

      if (!invite) {
        return res.status(400).json({ message: "Invalid invitation code" });
      }
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const user = new User({ name, email, password, role, phone, isDeliveryPartner: role === "customer" && !!isDeliveryPartner });
    await user.save();

    if (role === "admin" && invitationCode) {
      await AdminInvite.updateOne(
        { code: String(invitationCode).trim().toUpperCase() },
        { usedBy: user._id, usedAt: new Date(), isActive: false }
      );
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    await createNotification(user._id, {
      type: "system",
      title: "Welcome to Quick Food",
      message: `Welcome ${name}! Your account has been created successfully.`,
    });

    res.status(201).json({
      message: "Signup successful",
      token,
      user: user.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const isEmail = email.includes("@");

    const user = await User.findOne(
      isEmail ? { email: email.toLowerCase() } : { phone: email }
    );
    if (!user) {
      return res.status(401).json({ message: "Invalid email/phone or password" });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "Your account is inactive" });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      message: "Login successful",
      token,
      user: user.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

export const getProfile = async (req, res, next) => {
  try {
    res.json(req.user.toJSON());
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const allowedUpdates = ["name", "phone", "address", "city", "avatar", "addresses", "isDeliveryPartner"];
    const updates = Object.keys(req.body);
    const isValidUpdate = updates.every((update) => allowedUpdates.includes(update));

    if (!isValidUpdate) {
      return res.status(400).json({ message: "Invalid update fields" });
    }

    updates.forEach((update) => {
      req.user[update] = req.body[update];
    });

    await req.user.save();
    res.json({ message: "Profile updated", user: req.user.toJSON() });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const isPasswordValid = await req.user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    req.user.password = newPassword;
    await req.user.save();

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    next(error);
  }
};

export const verifyToken = async (req, res) => {
  res.json({ valid: true, user: req.user.toJSON() });
};

// ---------- OTP login (email or phone identifier) ----------
const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_OTP_ATTEMPTS = 5; // failed verifications allowed per code (on top of IP rate limiting)

export const requestOtp = async (req, res, next) => {
  try {
    const { identifier } = req.body; // email or phone
    const isEmail = identifier.includes("@");
    const user = await User.findOne(
      isEmail ? { email: identifier.toLowerCase() } : { phone: identifier }
    );

    if (!user) {
      return res.status(404).json({ message: "No account found with that email or phone" });
    }
    if (!user.isActive) {
      return res.status(403).json({ message: "Your account is suspended" });
    }

    const otp = generateOtp();
    user.otpCode = await bcrypt.hash(otp, 10); // store hashed, never plaintext
    user.otpExpiresAt = new Date(Date.now() + OTP_TTL_MS);
    user.otpAttempts = 0; // fresh code → fresh attempt budget
    await user.save();

    // Dev/demo convenience: with no SMS/email provider wired up the OTP is returned
    // in the response and delivered as an in-app notification — but never in production.
    const isDev = process.env.NODE_ENV !== "production";
    res.json({
      message: "OTP sent successfully",
      ...(isDev ? { otp, identifier: user.email } : {}),
    });
  } catch (error) {
    next(error);
  }
};

export const verifyOtp = async (req, res, next) => {
  try {
    const { identifier, otp } = req.body;
    const isEmail = identifier.includes("@");
    const user = await User.findOne(
      isEmail ? { email: identifier.toLowerCase() } : { phone: identifier }
    );

    if (!user || !user.otpCode) {
      return res.status(401).json({ message: "Invalid or expired OTP" });
    }
    if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      user.otpCode = undefined;
      user.otpExpiresAt = undefined;
      user.otpAttempts = 0;
      await user.save();
      return res.status(401).json({ message: "OTP expired. Please request a new one." });
    }
    if ((user.otpAttempts || 0) >= MAX_OTP_ATTEMPTS) {
      user.otpCode = undefined;
      user.otpExpiresAt = undefined;
      user.otpAttempts = 0;
      await user.save();
      return res
        .status(429)
        .json({ message: "Too many incorrect attempts. Please request a new OTP." });
    }

    const isMatch = await bcrypt.compare(otp, user.otpCode);
    if (!isMatch) {
      user.otpAttempts = (user.otpAttempts || 0) + 1;
      await user.save();
      const left = MAX_OTP_ATTEMPTS - user.otpAttempts;
      return res.status(401).json({
        message: `Invalid or expired OTP${left <= 2 ? ` (${left} attempt${left === 1 ? "" : "s"} left)` : ""}`,
      });
    }

    user.otpCode = undefined;
    user.otpExpiresAt = undefined;
    user.otpAttempts = 0;
    await user.save();

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({ message: "OTP verified", token, user: user.toJSON() });
  } catch (error) {
    next(error);
  }
};
