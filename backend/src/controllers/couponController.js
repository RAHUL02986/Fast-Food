import Coupon from "../models/Coupon.js";
import MenuItem from "../models/MenuItem.js";
import Restaurant from "../models/Restaurant.js";

/**
 * Evaluate a coupon against a cart.
 * `items` must already be server-validated: [{ menuItem, quantity, price }]
 * where `price` is the unit price from the DB (never trusted from the client).
 *
 * Returns { ok, reason?, discountAmount, eligibleSubtotal, coupon? }
 */
export const evaluateCouponForCart = (coupon, items) => {
  const now = new Date();

  if (!coupon || !coupon.isActive) {
    return { ok: false, reason: "This coupon is not active", discountAmount: 0, eligibleSubtotal: 0 };
  }
  if (coupon.validFrom && coupon.validFrom > now) {
    return { ok: false, reason: "This coupon is not active yet", discountAmount: 0, eligibleSubtotal: 0 };
  }
  if (coupon.validUntil && coupon.validUntil < now) {
    return { ok: false, reason: "This coupon has expired", discountAmount: 0, eligibleSubtotal: 0 };
  }
  if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
    return { ok: false, reason: "This coupon has reached its usage limit", discountAmount: 0, eligibleSubtotal: 0 };
  }

  // Items covered by the coupon — all items, or only the assigned products
  const eligibleItems = coupon.applyToAllItems
    ? items
    : items.filter((item) =>
        (coupon.applicableItems || []).some((id) => id.toString() === item.menuItem.toString())
      );

  const eligibleSubtotal = eligibleItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (eligibleItems.length === 0 || eligibleSubtotal <= 0) {
    return {
      ok: false,
      reason: "This coupon does not apply to the items in your cart",
      discountAmount: 0,
      eligibleSubtotal: 0,
    };
  }

  if (eligibleSubtotal < (coupon.minOrderAmount || 0)) {
    return {
      ok: false,
      reason: `Add items worth ₹${Math.ceil(coupon.minOrderAmount - eligibleSubtotal)} more to use this coupon`,
      discountAmount: 0,
      eligibleSubtotal,
    };
  }

  let discountAmount =
    coupon.discountType === "percentage"
      ? (eligibleSubtotal * coupon.discountValue) / 100
      : coupon.discountValue;

  if (coupon.discountType === "percentage" && coupon.maxDiscount > 0) {
    discountAmount = Math.min(discountAmount, coupon.maxDiscount);
  }
  // A coupon can never discount more than the items it covers
  discountAmount = Math.min(Math.round(discountAmount), eligibleSubtotal);

  return { ok: true, discountAmount, eligibleSubtotal, coupon };
};

/** Sanitize + validate the coupon payload coming from the owner. */
const buildCouponFields = async (body, restaurantId) => {
  const {
    code,
    description,
    discountType,
    discountValue,
    minOrderAmount,
    maxDiscount,
    applyToAllItems,
    applicableItems,
    validFrom,
    validUntil,
    usageLimit,
  } = body;

  if (!code || !String(code).trim()) {
    throw new Error("Coupon code is required");
  }
  if (!["percentage", "flat"].includes(discountType)) {
    throw new Error("Discount type must be 'percentage' or 'flat'");
  }
  const value = Number(discountValue);
  if (!value || value <= 0) {
    throw new Error("Discount value must be greater than 0");
  }
  if (discountType === "percentage" && value > 100) {
    throw new Error("Percentage discount cannot exceed 100%");
  }
  if (discountType === "flat" && maxDiscount) {
    throw new Error("Max discount cap only applies to percentage coupons");
  }

  const assignAll = !!applyToAllItems;
  let itemIds = [];
  if (!assignAll) {
    itemIds = Array.isArray(applicableItems) ? [...new Set(applicableItems)] : [];
    if (itemIds.length === 0) {
      throw new Error("Select at least one product, or choose 'Entire menu'");
    }
    // Every assigned product must belong to this restaurant
    const ownedCount = await MenuItem.countDocuments({
      _id: { $in: itemIds },
      restaurant: restaurantId,
    });
    if (ownedCount !== itemIds.length) {
      throw new Error("One or more selected products do not belong to this restaurant");
    }
  }

  const until = validUntil ? new Date(validUntil) : null;
  if (!until || Number.isNaN(until.getTime())) {
    throw new Error("A valid 'valid until' date is required");
  }
  const from = validFrom ? new Date(validFrom) : new Date();
  if (until <= from) {
    throw new Error("'Valid until' must be after 'valid from'");
  }

  return {
    code: String(code).trim().toUpperCase(),
    description: description?.trim() || "",
    discountType,
    discountValue: value,
    minOrderAmount: Math.max(0, Number(minOrderAmount) || 0),
    maxDiscount: discountType === "percentage" ? Math.max(0, Number(maxDiscount) || 0) : 0,
    applyToAllItems: assignAll,
    applicableItems: assignAll ? [] : itemIds,
    validFrom: from,
    validUntil: until,
    usageLimit: Math.max(0, Number(usageLimit) || 0),
  };
};

const verifyOwnerRestaurant = async (restaurantId, userId) =>
  Restaurant.findOne({ _id: restaurantId, owner: userId });

// ---------- Owner routes ----------

export const createCoupon = async (req, res, next) => {
  try {
    const { restaurantId } = req.params;
    console.log("Creating coupon for restaurant:", restaurantId, "by user:", req.user?._id, "role:", req.user?.role);

    const restaurant = await verifyOwnerRestaurant(restaurantId, req.user._id);
    if (!restaurant) {
      console.log("Restaurant not found or user doesn't own it:", { restaurantId, userId: req.user._id });
      return res.status(403).json({ message: "You don't have permission to manage coupons for this restaurant" });
    }

    let fields;
    try {
      fields = await buildCouponFields(req.body, restaurantId);
    } catch (validationError) {
      console.log("Coupon validation error:", validationError.message);
      return res.status(400).json({ message: validationError.message });
    }

    console.log("Coupon fields:", { ...fields, restaurant: restaurantId });

    const existing = await Coupon.findOne({ restaurant: restaurantId, code: fields.code });
    if (existing) {
      console.log("Coupon already exists:", fields.code);
      return res.status(409).json({ message: `Coupon code "${fields.code}" already exists for this restaurant` });
    }

    const coupon = await Coupon.create({ ...fields, restaurant: restaurantId });
    const populated = await coupon.populate("applicableItems", "name price category");

    console.log("Coupon created successfully:", populated._id, populated.code);

    res.status(201).json({
      message: "Coupon created successfully",
      data: populated,
    });
  } catch (error) {
    console.error("Error creating coupon:", error);
    next(error);
  }
};

export const getCoupons = async (req, res, next) => {
  try {
    const { restaurantId } = req.params;
    const ownerView = req.query.all === "true" && req.user?.role === "owner";

    const filter = { restaurant: restaurantId };
    if (!ownerView) {
      // Public view: only live coupons
      filter.isActive = true;
      filter.validFrom = { $lte: new Date() };
      filter.validUntil = { $gte: new Date() };
      filter.$or = [{ usageLimit: 0 }, { $expr: { $lt: ["$usedCount", "$usageLimit"] } }];
    }

    const coupons = await Coupon.find(filter)
      .populate("applicableItems", "name price category")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: coupons.length,
      data: coupons,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCoupon = async (req, res, next) => {
  try {
    const { restaurantId, id } = req.params;
    console.log("Updating coupon:", id, "for restaurant:", restaurantId, "by user:", req.user?._id);

    const restaurant = await verifyOwnerRestaurant(restaurantId, req.user._id);
    if (!restaurant) {
      console.log("Restaurant not found or user doesn't own it:", { restaurantId, userId: req.user._id });
      return res.status(403).json({ message: "You don't have permission to manage coupons for this restaurant" });
    }

    let fields;
    try {
      fields = await buildCouponFields(req.body, restaurantId);
    } catch (validationError) {
      console.log("Coupon validation error:", validationError.message);
      return res.status(400).json({ message: validationError.message });
    }

    console.log("Update fields:", { ...fields, restaurant: restaurantId });

    const duplicate = await Coupon.findOne({
      _id: { $ne: id },
      restaurant: restaurantId,
      code: fields.code,
    });
    if (duplicate) {
      console.log("Duplicate coupon code:", fields.code);
      return res.status(409).json({ message: `Coupon code "${fields.code}" already exists for this restaurant` });
    }

    const coupon = await Coupon.findOneAndUpdate(
      { _id: id, restaurant: restaurantId },
      fields,
      { new: true, runValidators: true }
    ).populate("applicableItems", "name price category");

    if (!coupon) {
      console.log("Coupon not found for update:", { _id: id, restaurant: restaurantId });
      return res.status(404).json({ message: "Coupon not found" });
    }

    console.log("Coupon updated successfully:", coupon._id, coupon.code);

    res.json({
      message: "Coupon updated successfully",
      data: coupon,
    });
  } catch (error) {
    console.error("Error updating coupon:", error);
    next(error);
  }
};

export const toggleCouponStatus = async (req, res, next) => {
  try {
    const { restaurantId, id } = req.params;
    const { isActive } = req.body;

    const restaurant = await verifyOwnerRestaurant(restaurantId, req.user._id);
    if (!restaurant) {
      return res.status(403).json({ message: "You don't have permission to manage coupons for this restaurant" });
    }

    const coupon = await Coupon.findOneAndUpdate(
      { _id: id, restaurant: restaurantId },
      { isActive: !!isActive },
      { new: true }
    ).populate("applicableItems", "name price category");

    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    res.json({
      message: `Coupon ${coupon.isActive ? "activated" : "deactivated"}`,
      data: coupon,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCoupon = async (req, res, next) => {
  try {
    const { restaurantId, id } = req.params;

    const restaurant = await verifyOwnerRestaurant(restaurantId, req.user._id);
    if (!restaurant) {
      return res.status(403).json({ message: "You don't have permission to manage coupons for this restaurant" });
    }

    const coupon = await Coupon.findOneAndDelete({ _id: id, restaurant: restaurantId });
    if (!coupon) {
      return res.status(404).json({ message: "Coupon not found" });
    }

    res.json({ message: "Coupon deleted successfully" });
  } catch (error) {
    next(error);
  }
};

// ---------- Public routes ----------

/**
 * POST /restaurants/:restaurantId/coupons/validate
 * Body: { code, items: [{ menuItem, quantity }] } — used by checkout for a live preview.
 */
export const validateCoupon = async (req, res, next) => {
  try {
    const { restaurantId } = req.params;
    const { code, items } = req.body;

    if (!code || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Coupon code and cart items are required" });
    }

    const coupon = await Coupon.findOne({
      restaurant: restaurantId,
      code: String(code).trim().toUpperCase(),
    });

    if (!coupon) {
      return res.status(404).json({ message: "Invalid coupon code" });
    }

    // Re-price the cart from the DB — client prices are never trusted
    const dbItems = [];
    for (const item of items) {
      const menuItem = await MenuItem.findById(item.menuItem);
      if (!menuItem || menuItem.restaurant.toString() !== restaurantId.toString() || !menuItem.isAvailable) {
        console.log("Coupon validation failed: invalid item", {
          itemId: item.menuItem,
          found: !!menuItem,
          itemRestaurant: menuItem?.restaurant?.toString(),
          expectedRestaurant: restaurantId.toString(),
          isAvailable: menuItem?.isAvailable,
        });
        return res.status(400).json({ message: "Cart contains an invalid or unavailable item" });
      }
      const quantity = Math.max(1, Number(item.quantity) || 1);
      dbItems.push({ menuItem: menuItem._id, quantity, price: menuItem.price });
    }

    console.log("Coupon validation debug:", {
      couponCode: coupon.code,
      applyToAllItems: coupon.applyToAllItems,
      applicableItems: coupon.applicableItems?.map((id) => id.toString()),
      cartItems: dbItems.map((i) => ({ id: i.menuItem.toString(), qty: i.quantity, price: i.price })),
      minOrderAmount: coupon.minOrderAmount,
    });

    const result = evaluateCouponForCart(coupon, dbItems);
    if (!result.ok) {
      console.log("Coupon evaluation failed:", {
        reason: result.reason,
        couponCode: coupon.code,
        applyToAllItems: coupon.applyToAllItems,
        applicableItems: coupon.applicableItems?.map((id) => id.toString()),
        cartItemIds: dbItems.map((i) => i.menuItem.toString()),
        eligibleSubtotal: result.eligibleSubtotal,
        minOrderAmount: coupon.minOrderAmount,
      });
      return res.status(400).json({ message: result.reason });
    }

    res.json({
      success: true,
      data: {
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount: result.discountAmount,
        eligibleSubtotal: result.eligibleSubtotal,
        applyToAllItems: coupon.applyToAllItems,
      },
    });
  } catch (error) {
    next(error);
  }
};
