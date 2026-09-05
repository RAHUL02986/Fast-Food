import MenuItem from "../models/MenuItem.js";
import Restaurant from "../models/Restaurant.js";

export const getMenuItems = async (req, res, next) => {
  try {
    const { restaurantId } = req.params;
    const { category, available } = req.query;

    const filter = { restaurant: restaurantId };

    if (category) {
      filter.category = category;
    }

    if (available === "true") {
      filter.isAvailable = true;
    }

    const items = await MenuItem.find(filter).sort({ category: 1, name: 1 });

    res.json({
      success: true,
      count: items.length,
      data: items,
    });
  } catch (error) {
    next(error);
  }
};

export const getMenuItemById = async (req, res, next) => {
  try {
    const item = await MenuItem.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: "Menu item not found" });
    }

    res.json({
      success: true,
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

export const createMenuItem = async (req, res, next) => {
  try {
    const { restaurantId } = req.params;

    // Verify owner
    const restaurant = await Restaurant.findOne({
      _id: restaurantId,
      owner: req.user._id,
    });

    if (!restaurant) {
      return res.status(403).json({ message: "You don't have permission to add items to this restaurant" });
    }

    const item = new MenuItem({
      ...req.body,
      restaurant: restaurantId,
    });

    await item.save();

    res.status(201).json({
      message: "Menu item created successfully",
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

export const updateMenuItem = async (req, res, next) => {
  try {
    const { restaurantId, id } = req.params;

    // Verify owner
    const restaurant = await Restaurant.findOne({
      _id: restaurantId,
      owner: req.user._id,
    });

    if (!restaurant) {
      return res.status(403).json({ message: "You don't have permission to update items in this restaurant" });
    }

    const item = await MenuItem.findOneAndUpdate(
      { _id: id, restaurant: restaurantId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!item) {
      return res.status(404).json({ message: "Menu item not found" });
    }

    res.json({
      message: "Menu item updated successfully",
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteMenuItem = async (req, res, next) => {
  try {
    const { restaurantId, id } = req.params;

    // Verify owner
    const restaurant = await Restaurant.findOne({
      _id: restaurantId,
      owner: req.user._id,
    });

    if (!restaurant) {
      return res.status(403).json({ message: "You don't have permission to delete items from this restaurant" });
    }

    const item = await MenuItem.findOneAndDelete({ _id: id, restaurant: restaurantId });

    if (!item) {
      return res.status(404).json({ message: "Menu item not found" });
    }

    res.json({ message: "Menu item deleted successfully" });
  } catch (error) {
    next(error);
  }
};

export const toggleAvailability = async (req, res, next) => {
  try {
    const { restaurantId, id } = req.params;
    const { isAvailable } = req.body;

    // Verify owner
    const restaurant = await Restaurant.findOne({
      _id: restaurantId,
      owner: req.user._id,
    });

    if (!restaurant) {
      return res.status(403).json({ message: "You don't have permission" });
    }

    const item = await MenuItem.findOneAndUpdate(
      { _id: id, restaurant: restaurantId },
      { isAvailable },
      { new: true }
    );

    if (!item) {
      return res.status(404).json({ message: "Menu item not found" });
    }

    res.json({
      message: "Availability updated",
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

export const getCategories = async (req, res, next) => {
  try {
    const { restaurantId } = req.params;

    const categories = await MenuItem.distinct("category", {
      restaurant: restaurantId,
    });

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};
