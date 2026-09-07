import Order from "../models/Order.js";
import MenuItem from "../models/MenuItem.js";
import Restaurant from "../models/Restaurant.js";
import Table from "../models/Table.js";
import Booking from "../models/Booking.js";
import { createNotification } from "../utils/notificationService.js";
import { settleDeliveryEarning } from "../utils/deliverySettlement.js";

// Generate unique order number
const generateOrderNumber = () => {
  return "ORD-" + Date.now() + Math.random().toString(36).substring(7).toUpperCase();
};

export const createOrder = async (req, res, next) => {
  try {
    const {
      items,
      restaurant,
      deliveryAddress,
      specialInstructions,
      paymentMethod,
      type = "delivery",
      table: tableId,
      booking: bookingId,
    } = req.body;

    if (!["delivery", "dine-in"].includes(type)) {
      return res.status(400).json({ message: "Invalid order type" });
    }

    // Validate restaurant exists
    const restaurantDoc = await Restaurant.findById(restaurant);
    if (!restaurantDoc) {
      return res.status(404).json({ message: "Restaurant not found" });
    }
    if (restaurantDoc.status !== "approved" || restaurantDoc.isActive === false) {
      return res.status(400).json({ message: "This restaurant is not accepting orders" });
    }

    // Validate items and calculate total
    let subtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const menuItem = await MenuItem.findById(item.menuItem);
      if (!menuItem) {
        return res.status(404).json({ message: `Menu item ${item.menuItem} not found` });
      }

      if (!menuItem.isAvailable) {
        return res.status(400).json({ message: `${menuItem.name} is not available` });
      }

      const itemPrice = menuItem.price * item.quantity;
      subtotal += itemPrice;

      validatedItems.push({
        menuItem: item.menuItem,
        quantity: item.quantity,
        price: menuItem.price,
        specialInstructions: item.specialInstructions,
      });
    }

    let deliveryCharge = 0;
    let tax = Math.round(subtotal * 0.05); // 5% tax
    let total = 0;
    let table = null;
    let booking = null;

    if (type === "delivery") {
      if (!deliveryAddress) {
        return res.status(400).json({ message: "Delivery address is required" });
      }
      deliveryCharge = restaurantDoc.deliveryCharge || 40;
      total = subtotal + deliveryCharge + tax;
    } else {
      // Dine-in: verify the table belongs to this restaurant
      if (!tableId) {
        return res.status(400).json({ message: "Table is required for a dine-in order" });
      }
      table = await Table.findById(tableId);
      if (!table || table.restaurant.toString() !== restaurantDoc._id.toString()) {
        return res.status(400).json({ message: "Invalid table for this restaurant" });
      }
      if (bookingId) {
        booking = await Booking.findById(bookingId);
        if (!booking || booking.restaurant.toString() !== restaurantDoc._id.toString()) {
          return res.status(400).json({ message: "Invalid booking for this restaurant" });
        }
      }
      // Dine-in orders are paid at the table — no delivery charge
      total = subtotal + tax;
    }

    const order = new Order({
      orderNumber: generateOrderNumber(),
      customer: req.user._id,
      restaurant,
      items: validatedItems,
      subtotal,
      deliveryCharge,
      tax,
      total,
      deliveryAddress: type === "delivery" ? deliveryAddress : undefined,
      specialInstructions,
      paymentMethod,
      type,
      table: table?._id,
      booking: booking?._id,
      estimatedDeliveryTime:
        type === "delivery" ? new Date(Date.now() + restaurantDoc.deliveryTime * 60000) : undefined,
    });

    await order.save();
    await order.populate("restaurant", "name");
    if (order.table) await order.populate("table", "name");

    // Notify restaurant
    await createNotification(restaurantDoc.owner, {
      type: "order",
      title: "New Order Received",
      message:
        type === "dine-in"
          ? `New dine-in order ${order.orderNumber}${table ? ` at table ${table.name}` : ""}`
          : `New delivery order ${order.orderNumber} from customer`,
      relatedId: order._id,
    });

    res.status(201).json({
      message: "Order created successfully",
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

export const getOrders = async (req, res, next) => {
  try {
    const { status, restaurantId, type, date } = req.query;
    const filter = {};

    if (req.user.role === "customer") {
      filter.customer = req.user._id;
    } else if (req.user.role === "owner") {
      // Owners are always scoped to their own restaurant — ignore client-provided ids
      const ownRestaurant = await Restaurant.findOne({ owner: req.user._id });
      filter.restaurant = ownRestaurant?._id;
    } else if (req.user.role === "delivery_partner") {
      // Delivery partners only ever see orders assigned to them
      filter.deliveryPartner = req.user._id;
    } else if (req.user.role === "admin" && restaurantId) {
      // Admin oversight is read-only and scoped per-restaurant for this listing
      filter.restaurant = restaurantId;
    }

    if (status) {
      filter.status = status;
    }
    if (type) {
      filter.type = type;
    }
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      filter.createdAt = { $gte: startDate, $lte: endDate };
    }

    const orders = await Order.find(filter)
      .populate("restaurant", "name")
      .populate("customer", "name phone")
      .populate("table", "name")
      .populate("items.menuItem", "name")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    next(error);
  }
};

export const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("restaurant")
      .populate("customer", "name phone address email")
      .populate("items.menuItem")
      .populate("table", "name");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Check permissions — customer/restaurant may be populated documents,
    // so resolve their IDs safely whether they're ObjectIds or populated docs
    const customerId = order.customer?._id ? order.customer._id.toString() : order.customer?.toString();
    if (req.user.role === "customer" && customerId !== req.user._id.toString()) {
      return res.status(403).json({ message: "You don't have permission to view this order" });
    }

    // Delivery partners can only view orders assigned to them
    if (
      req.user.role === "delivery_partner" &&
      (!order.deliveryPartner || order.deliveryPartner.toString() !== req.user._id.toString())
    ) {
      return res.status(403).json({ message: "You are not assigned to this order" });
    }

    const restaurantOwnerId = order.restaurant?.owner?._id
      ? order.restaurant.owner._id.toString()
      : order.restaurant?.owner?.toString();
    if (req.user.role === "owner" && restaurantOwnerId !== req.user._id.toString()) {
      return res.status(403).json({ message: "You don't have permission to view this order" });
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

export const updateOrderStatus = async (req, res, next) => {
  try {
    const { status, note } = req.body;

    const validStatuses = [
      "confirmed",
      "preparing",
      "ready",
      "out_for_delivery",
      "delivered",
      "served",
      "cancelled",
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Verify permission — only the owning restaurant can update order status
    if (req.user.role !== "owner") {
      return res.status(403).json({ message: "Only the restaurant owner can update order status" });
    }

    const restaurant = await Restaurant.findOne({
      _id: order.restaurant,
      owner: req.user._id,
    });

    if (!restaurant) {
      return res.status(403).json({ message: "You don't have permission to update this order" });
    }

    const previousStatus = order.status;
    order.status = status;

    if (status === "delivered" || status === "served") {
      order.paymentStatus = "completed";
    }
    if (status === "delivered") {
      order.actualDeliveryTime = new Date();
    }

    // Keep the dine-in table state in sync
    if (order.type === "dine-in" && order.table) {
      const table = await Table.findById(order.table);
      if (table) {
        if (["confirmed", "preparing", "ready"].includes(status)) {
          table.status = "occupied";
          await table.save();
        } else if (["served", "cancelled"].includes(status) && table.status === "occupied") {
          table.status = "free";
          await table.save();
        }
      }
    }

    if (order.statusUpdates) {
      order.statusUpdates.push({
        status,
        timestamp: new Date(),
        note,
      });
    }

    await order.save();

    // Owner marked a delivery order delivered — settle the assigned partner's
    // earning too (shared, idempotent; no-ops when no partner is assigned).
    if (status === "delivered" && order.deliveryPartner) {
      await settleDeliveryEarning({ order, partnerUserId: order.deliveryPartner });
    }

    // Notify customer
    const statusLabel = status === "served" ? "served at your table" : status;
    await createNotification(order.customer, {
      type: "order",
      title: `Order ${status}`,
      message: `Your order ${order.orderNumber} is now ${statusLabel}`,
      relatedId: order._id,
    });

    res.json({
      message: "Order status updated",
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

// Owner rejects an incoming order
export const rejectOrder = async (req, res, next) => {
  try {
    const { reason } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const restaurant = await Restaurant.findOne({
      _id: order.restaurant,
      owner: req.user._id,
    });

    if (!restaurant) {
      return res.status(403).json({ message: "You don't have permission to reject this order" });
    }

    if (!["placed", "confirmed"].includes(order.status)) {
      return res.status(400).json({ message: "Only new orders can be rejected" });
    }

    order.status = "cancelled";
    order.cancelReason = reason || "Rejected by restaurant";
    if (order.statusUpdates) {
      order.statusUpdates.push({
        status: "cancelled",
        timestamp: new Date(),
        note: order.cancelReason,
      });
    }
    await order.save();

    await createNotification(order.customer, {
      type: "order",
      title: "Order Rejected",
      message: `Your order ${order.orderNumber} was rejected. Reason: ${order.cancelReason}`,
      relatedId: order._id,
    });

    res.json({ message: "Order rejected", data: order });
  } catch (error) {
    next(error);
  }
};

// Owner daily summary — today's orders, revenue and bookings
export const getDailySummary = async (req, res, next) => {
  try {
    const ownRestaurant = await Restaurant.findOne({ owner: req.user._id });
    if (!ownRestaurant) {
      return res.status(404).json({ message: "No restaurant found for this owner" });
    }

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const match = { restaurant: ownRestaurant._id, createdAt: { $gte: start, $lte: end } };

    const [ordersCount, revenueAgg, deliveries, dineIns, activeOrders, bookingsCount, statusBreakdown] =
      await Promise.all([
        Order.countDocuments(match),
        Order.aggregate([
          { $match: { ...match, status: { $nin: ["cancelled"] } } },
          { $group: { _id: null, total: { $sum: "$total" } } },
        ]),
        Order.countDocuments({ ...match, type: "delivery" }),
        Order.countDocuments({ ...match, type: "dine-in" }),
        Order.countDocuments({
          restaurant: ownRestaurant._id,
          status: { $in: ["placed", "confirmed", "preparing", "ready", "out_for_delivery"] },
        }),
        Booking.countDocuments({
          restaurant: ownRestaurant._id,
          createdAt: { $gte: start, $lte: end },
        }),
        Order.aggregate([
          { $match: { restaurant: ownRestaurant._id, createdAt: { $gte: start, $lte: end } } },
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),
      ]);

    res.json({
      success: true,
      data: {
        date: start.toISOString().slice(0, 10),
        ordersToday: ordersCount,
        revenueToday: revenueAgg[0]?.total || 0,
        deliveryOrders: deliveries,
        dineInOrders: dineIns,
        activeOrders,
        bookingsToday: bookingsCount,
        statusBreakdown,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const cancelOrder = async (req, res, next) => {
  try {
    const { reason } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only cancel your own orders" });
    }

    if (!["placed", "confirmed"].includes(order.status)) {
      return res.status(400).json({ message: "Order cannot be cancelled in current status" });
    }

    order.status = "cancelled";
    order.cancelReason = reason;
    await order.save();

    // Notify restaurant
    const restaurant = await Restaurant.findById(order.restaurant);
    await createNotification(restaurant.owner, {
      type: "order",
      title: "Order Cancelled",
      message: `Order ${order.orderNumber} has been cancelled. Reason: ${reason}`,
      relatedId: order._id,
    });

    res.json({
      message: "Order cancelled successfully",
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

export const rateOrder = async (req, res, next) => {
  try {
    const { rating, review } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only rate your own orders" });
    }

    if (order.status !== "delivered") {
      return res.status(400).json({ message: "You can only rate delivered orders" });
    }

    order.rating = rating;
    order.review = review;
    await order.save();

    res.json({
      message: "Order rated successfully",
      data: order,
    });
  } catch (error) {
    next(error);
  }
};

// ---------- Delivery partner endpoints ----------

/** GET /orders/delivery-partner/available — orders ready for pickup, not yet assigned. */
export const getAvailableDeliveryOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({
      type: "delivery",
      status: { $in: ["confirmed", "preparing", "ready"] },
      deliveryPartner: { $exists: false },
    })
      .populate("restaurant", "name city location latitude longitude deliveryAddress")
      .populate("items.menuItem", "name price")
      .sort({ createdAt: 1 })
      .limit(20);

    res.json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    next(error);
  }
};

/** GET /orders/delivery-partner/my — orders currently assigned to this partner. */
export const getMyDeliveryOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({
      type: "delivery",
      deliveryPartner: req.user._id,
      status: { $nin: ["delivered", "cancelled"] },
    })
      .populate("restaurant", "name city location latitude longitude")
      .populate("customer", "name phone")
      .populate("items.menuItem", "name price")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    next(error);
  }
};

/** PATCH /orders/:id/accept — partner picks up an order → sets deliveryPartner + "out_for_delivery". */
export const acceptDeliveryOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.type !== "delivery") {
      return res.status(400).json({ message: "This is not a delivery order" });
    }

    if (order.deliveryPartner && order.deliveryPartner.toString() !== req.user._id.toString()) {
      return res.status(409).json({ message: "This order is already assigned to another partner" });
    }

    // Claimable states: normal pickup states, plus an order the owner pushed
    // straight to "out_for_delivery" without assigning a partner (self-delivery
    // flow) — a partner must still be able to claim it so tracking works.
    const claimable =
      ["placed", "confirmed", "preparing", "ready"].includes(order.status) ||
      (order.status === "out_for_delivery" && !order.deliveryPartner);

    if (!claimable) {
      return res.status(400).json({ message: `Cannot accept order in status "${order.status}"` });
    }

    order.deliveryPartner = req.user._id;
    order.status = "out_for_delivery";
    order.statusUpdates = order.statusUpdates || [];
    order.statusUpdates.push({ status: "out_for_delivery", timestamp: new Date(), note: "Out for delivery" });
    await order.save();

    await createNotification(order.customer, {
      type: "order",
      title: "Order out for delivery",
      message: `Your order ${order.orderNumber} is on its way!`,
      relatedId: order._id,
    });

    res.json({ message: "Order accepted", data: order });
  } catch (error) {
    next(error);
  }
};

/** PATCH /orders/:id/location — partner reports live location (lat/lng). */
export const updateDeliveryLocation = async (req, res, next) => {
  try {
    const { lat, lng } = req.body;
    if (lat === undefined || lng === undefined || isNaN(parseFloat(lat)) || isNaN(parseFloat(lng))) {
      return res.status(400).json({ message: "lat and lng are required" });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    if (!order.deliveryPartner || order.deliveryPartner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You are not assigned to this order" });
    }

    req.user.currentLocation = { lat: parseFloat(lat), lng: parseFloat(lng) };
    req.user.isAvailable = false;
    await req.user.save();

    res.json({
      message: "Location updated",
      data: {
        lat: req.user.currentLocation.lat,
        lng: req.user.currentLocation.lng,
      },
    });
  } catch (error) {
    next(error);
  }
};

/** PATCH /orders/:id/delivered — partner confirms delivery → status "delivered". */
export const markOrderDelivered = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    if (!order.deliveryPartner || order.deliveryPartner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You are not assigned to this order" });
    }

    order.status = "delivered";
    order.actualDeliveryTime = new Date();
    order.paymentStatus = "completed";
    order.statusUpdates = order.statusUpdates || [];
    order.statusUpdates.push({ status: "delivered", timestamp: new Date(), note: "Delivered" });
    await order.save();

    // Automatic earnings record + partner lifetime stats (shared, idempotent).
    const stillBusy = order.deliveryPartner
      ? (await settleDeliveryEarning({ order, partnerUserId: order.deliveryPartner })).stillBusy
      : 0;
    req.user.isAvailable = stillBusy === 0;
    req.user.currentLocation = null;
    await req.user.save();

    await createNotification(order.customer, {
      type: "order",
      title: "Order Delivered",
      message: `Your order ${order.orderNumber} has been delivered. Enjoy!`,
      relatedId: order._id,
    });

    res.json({ message: "Order delivered", data: order });
  } catch (error) {
    next(error);
  }
};

/** GET /orders/:id/track — live tracking for the ordering customer (or owner/admin). */
export const trackDelivery = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("restaurant", "name latitude longitude")
      .populate("deliveryPartner", "name phone isAvailable currentLocation");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const isAdmin = req.user.role === "admin";
    const isOwner = req.user.role === "owner";

    if (req.user.role === "customer" && !isAdmin && !isOwner) {
      const customerId = order.customer?._id ? order.customer._id.toString() : order.customer?.toString();
      if (customerId !== req.user._id.toString()) {
        return res.status(403).json({ message: "You can only track your own order" });
      }
    }

    res.json({
      success: true,
      data: {
        orderNumber: order.orderNumber,
        status: order.status,
        restaurant: order.restaurant,
        deliveryAddress: order.deliveryAddress,
        statusUpdates: order.statusUpdates,
        estimatedDeliveryTime: order.estimatedDeliveryTime,
        actualDeliveryTime: order.actualDeliveryTime,
        deliveryPartner:
          order.deliveryPartner && order.deliveryPartner._id
            ? {
                name: order.deliveryPartner.name,
                phone: order.deliveryPartner.phone,
                location: order.deliveryPartner.currentLocation,
              }
            : null,
      },
    });
  } catch (error) {
    next(error);
  }
};
