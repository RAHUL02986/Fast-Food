import User from "../models/User.js";
import Restaurant from "../models/Restaurant.js";
import Booking from "../models/Booking.js";
import Report from "../models/Report.js";
import AdminInvite from "../models/AdminInvite.js";
import { createNotification } from "../utils/notificationService.js";

export const generateAdminInvite = async (req, res, next) => {
  try {
    const code = `QF-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

    const invite = await AdminInvite.create({
      code,
      createdBy: req.user._id,
      expiresAt,
    });

    res.status(201).json({
      message: "Admin invite generated",
      data: {
        code: invite.code,
        expiresAt: invite.expiresAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ---------- Read-only oversight ----------
export const getCustomers = async (req, res, next) => {
  try {
    const { search, status } = req.query;
    const filter = { role: "customer" };

    if (search) {
      filter.$or = [
        { name: new RegExp(search, "i") },
        { email: new RegExp(search, "i") },
        { phone: new RegExp(search, "i") },
      ];
    }
    if (status === "active") filter.isActive = true;
    if (status === "suspended") filter.isActive = false;

    const customers = await User.find(filter)
      .sort({ createdAt: -1 })
      .select("-password -otpCode -otpExpiresAt");

    res.json({ success: true, count: customers.length, data: customers });
  } catch (error) {
    next(error);
  }
};

export const getAllBookingsAdmin = async (req, res, next) => {
  try {
    const { status, date } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      filter.createdAt = { $gte: start, $lte: end };
    }

    const bookings = await Booking.find(filter)
      .populate("restaurant", "name city")
      .populate("slot")
      .populate("customer", "name email phone")
      .sort({ createdAt: -1 });

    res.json({ success: true, count: bookings.length, data: bookings });
  } catch (error) {
    next(error);
  }
};

// ---------- Moderation: suspend / activate ----------
export const setUserActive = async (req, res, next) => {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== "boolean") {
      return res.status(400).json({ message: "isActive must be a boolean" });
    }

    // Admin can suspend customers; owner accounts are moderated only via the restaurant
    const user = await User.findOne({ _id: req.params.id, role: "customer" });
    if (!user) {
      return res.status(404).json({ message: "Customer not found" });
    }

    user.isActive = isActive;
    await user.save();

    await createNotification(user._id, {
      type: "system",
      title: isActive ? "Account Activated" : "Account Suspended",
      message: isActive
        ? "Your account has been reactivated. Welcome back!"
        : "Your account has been suspended by an administrator.",
    });

    res.json({
      message: isActive ? "Customer activated" : "Customer suspended",
      data: user.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

export const setRestaurantActive = async (req, res, next) => {
  try {
    const { isActive, reason } = req.body;
    if (typeof isActive !== "boolean") {
      return res.status(400).json({ message: "isActive must be a boolean" });
    }

    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    restaurant.isActive = isActive;
    restaurant.suspendedReason = isActive ? undefined : reason || "Suspended by administrator";
    await restaurant.save();

    await createNotification(restaurant.owner, {
      type: "restaurant",
      title: isActive ? "Restaurant Activated" : "Restaurant Suspended",
      message: isActive
        ? `Your restaurant "${restaurant.name}" has been reactivated.`
        : `Your restaurant "${restaurant.name}" has been suspended. Reason: ${restaurant.suspendedReason}`,
      relatedId: restaurant._id,
    });

    res.json({
      message: isActive ? "Restaurant activated" : "Restaurant suspended",
      data: restaurant,
    });
  } catch (error) {
    next(error);
  }
};

// Customer files a complaint/report (handled read-only by admins)
export const createReport = async (req, res, next) => {
  try {
    const { restaurant, order, category, subject, description } = req.body;
    const report = new Report({
      customer: req.user._id,
      restaurant: restaurant || undefined,
      order: order || undefined,
      category,
      subject,
      description,
    });
    await report.save();
    res.status(201).json({ message: "Report submitted", data: report });
  } catch (error) {
    next(error);
  }
};

// ---------- Reports / complaints (view + status only) ----------
export const getReports = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const reports = await Report.find(filter)
      .populate("customer", "name email phone")
      .populate("restaurant", "name")
      .populate("order", "orderNumber")
      .sort({ createdAt: -1 });

    res.json({ success: true, count: reports.length, data: reports });
  } catch (error) {
    next(error);
  }
};

export const updateReportStatus = async (req, res, next) => {
  try {
    const { status, adminNotes } = req.body;
    const valid = ["open", "reviewing", "resolved", "dismissed"];
    if (!valid.includes(status)) {
      return res.status(400).json({ message: "Invalid report status" });
    }

    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    report.status = status;
    if (adminNotes !== undefined) report.adminNotes = adminNotes;
    await report.save();

    // Inform the customer who filed it
    await createNotification(report.customer, {
      type: "system",
      title: `Report ${status}`,
      message: `Your report "${report.subject}" is now marked ${status}.`,
      relatedId: report._id,
    });

    res.json({ message: "Report updated", data: report });
  } catch (error) {
    next(error);
  }
};

// ADMIN: set a NEW password for a user. Existing passwords are one-way bcrypt
// hashes and can NEVER be revealed — this replaces them instead.
export const resetUserPassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body || {};
    if (!newPassword || String(newPassword).length < 8) {
      return res.status(400).json({ message: "newPassword is required (min 8 characters)" });
    }
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.role === "admin") {
      return res.status(403).json({ message: "Admin passwords cannot be reset from this endpoint" });
    }
    user.password = String(newPassword); // hashed by the User pre-save hook
    await user.save();
    res.json({ success: true, message: "Password reset for " + user.email + ". They can now log in with the new password." });
  } catch (error) {
    next(error);
  }
};
