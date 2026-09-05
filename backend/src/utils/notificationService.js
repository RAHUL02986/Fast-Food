import Notification from "../models/Notification.js";

export const createNotification = async (userId, notification) => {
  try {
    const newNotification = new Notification({
      user: userId,
      ...notification,
    });
    await newNotification.save();
    return newNotification;
  } catch (error) {
    console.error("Error creating notification:", error);
  }
};

export const getNotifications = async (userId, limit = 10, skip = 0) => {
  try {
    const notifications = await Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await Notification.countDocuments({ user: userId });

    return { notifications, total };
  } catch (error) {
    console.error("Error fetching notifications:", error);
    throw error;
  }
};

export const markAsRead = async (notificationId) => {
  try {
    return await Notification.findByIdAndUpdate(
      notificationId,
      { read: true, readAt: new Date() },
      { new: true }
    );
  } catch (error) {
    console.error("Error marking notification as read:", error);
    throw error;
  }
};
