import Order from "../models/Order.js";
import Booking from "../models/Booking.js";
import Restaurant from "../models/Restaurant.js";
import User from "../models/User.js";

export const getAdminDashboard = async (req, res, next) => {
  try {
    const [orders, bookings, restaurants, users] = await Promise.all([
      Order.countDocuments(),
      Booking.countDocuments(),
      Restaurant.countDocuments(),
      User.countDocuments(),
    ]);

    const [orderRevenue, bookingRevenue] = await Promise.all([
      Order.aggregate([
        { $match: { status: { $ne: "cancelled" } } },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
      Booking.aggregate([
        { $match: { status: { $ne: "cancelled" } } },
        { $group: { _id: null, total: { $sum: "$price" } } },
      ]),
    ]);

    const totalRevenue = (orderRevenue[0]?.total || 0) + (bookingRevenue[0]?.total || 0);

    const monthlyOrders = await Order.aggregate([
      {
        $group: {
          _id: {
            month: { $month: "$createdAt" },
            year: { $year: "$createdAt" },
          },
          count: { $sum: 1 },
          revenue: { $sum: "$total" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
      { $limit: 12 },
    ]);

    res.json({
      success: true,
      data: {
        stats: {
          totalOrders: orders,
          totalBookings: bookings,
          totalRestaurants: restaurants,
          totalUsers: users,
          totalRevenue,
        },
        monthlyOrders,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getRestaurantAnalytics = async (req, res, next) => {
  try {
    const { restaurantId } = req.params;

    // Verify owner
    const restaurant = await Restaurant.findOne({
      _id: restaurantId,
      owner: req.user._id,
    });

    if (!restaurant) {
      return res.status(403).json({ message: "You don't have permission to view these analytics" });
    }

    const [orders, bookings] = await Promise.all([
      Order.countDocuments({ restaurant: restaurantId, status: { $ne: "cancelled" } }),
      Booking.countDocuments({ restaurant: restaurantId, status: { $ne: "cancelled" } }),
    ]);

    const [orderRevenue] = await Order.aggregate([
      {
        $match: { restaurant: restaurant._id, status: { $ne: "cancelled" } },
      },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]);

    const monthlyOrders = await Order.aggregate([
      {
        $match: { restaurant: restaurant._id },
      },
      {
        $group: {
          _id: {
            month: { $month: "$createdAt" },
            year: { $year: "$createdAt" },
          },
          count: { $sum: 1 },
          revenue: { $sum: "$total" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
      { $limit: 12 },
    ]);

    const topMenuItems = await Order.aggregate([
      {
        $match: { restaurant: restaurant._id },
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.menuItem",
          count: { $sum: "$items.quantity" },
          revenue: { $sum: { $multiply: ["$items.quantity", "$items.price"] } },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "menuitems",
          localField: "_id",
          foreignField: "_id",
          as: "item",
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        stats: {
          totalOrders: orders,
          totalBookings: bookings,
          revenue: orderRevenue?.total || 0,
        },
        monthlyOrders,
        topMenuItems,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getOrderAnalytics = async (req, res, next) => {
  try {
    const orderStatusBreakdown = await Order.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const topRestaurants = await Order.aggregate([
      { $match: { status: { $ne: "cancelled" } } },
      {
        $group: {
          _id: "$restaurant",
          count: { $sum: 1 },
          revenue: { $sum: "$total" },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "restaurants",
          localField: "_id",
          foreignField: "_id",
          as: "restaurant",
        },
      },
    ]);

    const averageOrderValue = await Order.aggregate([
      { $match: { status: { $ne: "cancelled" } } },
      {
        $group: {
          _id: null,
          avgValue: { $avg: "$total" },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        statusBreakdown: orderStatusBreakdown,
        topRestaurants,
        averageOrderValue: averageOrderValue[0]?.avgValue || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getBookingAnalytics = async (req, res, next) => {
  try {
    const bookingStatusBreakdown = await Booking.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const topBookedRestaurants = await Booking.aggregate([
      { $match: { status: { $ne: "cancelled" } } },
      {
        $group: {
          _id: "$restaurant",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: "restaurants",
          localField: "_id",
          foreignField: "_id",
          as: "restaurant",
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        statusBreakdown: bookingStatusBreakdown,
        topBookedRestaurants,
      },
    });
  } catch (error) {
    next(error);
  }
};
