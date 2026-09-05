import express from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import {
  getNotifications,
  markAsRead,
} from "../utils/notificationService.js";
import Notification from "../models/Notification.js";

const router = express.Router();

// Get all notifications for current user
router.get("/", authenticate, async (req, res, next) => {
  try {
    const { limit = 10, skip = 0 } = req.query;

    const { notifications, total } = await getNotifications(
      req.user._id,
      parseInt(limit),
      parseInt(skip)
    );

    const unreadCount = await Notification.countDocuments({
      user: req.user._id,
      read: false,
    });

    res.json({
      success: true,
      count: notifications.length,
      total,
      unreadCount,
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
});

// Mark single notification as read
router.patch("/:id/read", authenticate, async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    const updated = await markAsRead(req.params.id);
    res.json({ message: "Notification marked as read", data: updated });
  } catch (error) {
    next(error);
  }
});

// Mark all notifications as read
router.patch("/read-all", authenticate, async (req, res, next) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, read: false },
      { read: true, readAt: new Date() }
    );

    res.json({ message: "All notifications marked as read" });
  } catch (error) {
    next(error);
  }
});

// Delete notification
router.delete("/:id", authenticate, async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json({ message: "Notification deleted successfully" });
  } catch (error) {
    next(error);
  }
});

export default router;
