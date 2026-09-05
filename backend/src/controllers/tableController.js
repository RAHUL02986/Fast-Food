import Table from "../models/Table.js";
import Restaurant from "../models/Restaurant.js";
import Booking from "../models/Booking.js";
import Order from "../models/Order.js";

const generateTableCode = () =>
  "TBL-" + Math.random().toString(36).substring(2, 8).toUpperCase();

// ---------- Owner: table CRUD ----------
export const createTable = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findOne({ owner: req.user._id });
    if (!restaurant) {
      return res.status(404).json({ message: "No restaurant found for this owner" });
    }

    const { name, capacity } = req.body;
    const table = new Table({
      restaurant: restaurant._id,
      name,
      capacity,
      qrCode: generateTableCode(),
    });
    await table.save();

    res.status(201).json({ message: "Table created", data: table });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "A table with that name already exists" });
    }
    next(error);
  }
};

export const getTables = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findOne({ owner: req.user._id });
    if (!restaurant) {
      return res.status(404).json({ message: "No restaurant found for this owner" });
    }

    const tables = await Table.find({ restaurant: restaurant._id }).sort({ name: 1 });
    res.json({ success: true, count: tables.length, data: tables });
  } catch (error) {
    next(error);
  }
};

export const updateTable = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findOne({ owner: req.user._id });
    if (!restaurant) {
      return res.status(404).json({ message: "No restaurant found for this owner" });
    }

    const table = await Table.findOne({ _id: req.params.id, restaurant: restaurant._id });
    if (!table) {
      return res.status(404).json({ message: "Table not found" });
    }

    const allowed = ["name", "capacity", "status", "isActive"];
    for (const key of allowed) {
      if (req.body[key] !== undefined) table[key] = req.body[key];
    }
    await table.save();

    res.json({ message: "Table updated", data: table });
  } catch (error) {
    next(error);
  }
};

export const deleteTable = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findOne({ owner: req.user._id });
    if (!restaurant) {
      return res.status(404).json({ message: "No restaurant found for this owner" });
    }

    const table = await Table.findOneAndDelete({ _id: req.params.id, restaurant: restaurant._id });
    if (!table) {
      return res.status(404).json({ message: "Table not found" });
    }

    res.json({ message: "Table deleted" });
  } catch (error) {
    next(error);
  }
};

// Mark a table as occupied / free (used by owners during service)
export const setTableStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!["free", "occupied", "reserved", "inactive"].includes(status)) {
      return res.status(400).json({ message: "Invalid table status" });
    }

    const restaurant = await Restaurant.findOne({ owner: req.user._id });
    if (!restaurant) {
      return res.status(404).json({ message: "No restaurant found for this owner" });
    }

    const table = await Table.findOne({ _id: req.params.id, restaurant: restaurant._id });
    if (!table) {
      return res.status(404).json({ message: "Table not found" });
    }

    table.status = status;
    await table.save();

    res.json({ message: `Table marked ${status}`, data: table });
  } catch (error) {
    next(error);
  }
};

// ---------- Public: resolve a scanned table QR code ----------
export const resolveTableByCode = async (req, res, next) => {
  try {
    const table = await Table.findOne({ qrCode: req.params.code, isActive: true }).populate(
      "restaurant",
      "name description cuisine location city rating banner photos openingTime closingTime deliveryTime isActive"
    );

    if (!table || !table.restaurant || table.restaurant.isActive === false) {
      return res.status(404).json({ message: "Invalid or expired table QR code" });
    }

    res.json({
      success: true,
      data: {
        table: { _id: table._id, name: table.name, capacity: table.capacity, status: table.status },
        restaurant: table.restaurant,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Live dine-in orders for a table (used by the table landing page for status polling)
export const getTableOrders = async (req, res, next) => {
  try {
    const table = await Table.findById(req.params.tableId);
    if (!table) {
      return res.status(404).json({ message: "Table not found" });
    }

    const statuses = ["placed", "confirmed", "preparing", "ready"];
    const orders = await Order.find({
      table: table._id,
      type: "dine-in",
      status: { $in: req.query.all ? statuses.concat(["served", "cancelled"]) : statuses },
    })
      .populate("restaurant", "name")
      .populate("table", "name")
      .populate("items.menuItem", "name")
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    next(error);
  }
};