import Review from "../models/Review.js";
import Order from "../models/Order.js";
import MenuItem from "../models/MenuItem.js";
import Restaurant from "../models/Restaurant.js";

export const createReview = async (req, res, next) => {
  try {
    const { restaurant, menuItem, type, rating, comment, photos } = req.body;

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    const review = new Review({
      customer: req.user._id,
      restaurant,
      menuItem,
      type,
      rating,
      comment,
      photos,
    });

    await review.save();

    // Update restaurant rating if it's a restaurant review
    if (type === "restaurant" && restaurant) {
      const allReviews = await Review.find({ restaurant });
      const avgRating =
        allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

      await Restaurant.findByIdAndUpdate(
        restaurant,
        {
          rating: parseFloat(avgRating.toFixed(2)),
          reviewCount: allReviews.length,
        },
        { new: true }
      );
    }

    // Update menu item rating if it's a food review
    if (type === "food" && menuItem) {
      const itemReviews = await Review.find({ menuItem });
      const avgRating =
        itemReviews.reduce((sum, r) => sum + r.rating, 0) / itemReviews.length;

      await MenuItem.findByIdAndUpdate(
        menuItem,
        {
          rating: parseFloat(avgRating.toFixed(2)),
          reviewCount: itemReviews.length,
        },
        { new: true }
      );
    }

    res.status(201).json({
      message: "Review created successfully",
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

export const getReviews = async (req, res, next) => {
  try {
    const { restaurantId, menuItemId, type } = req.query;

    const filter = {};

    if (restaurantId) filter.restaurant = restaurantId;
    if (menuItemId) filter.menuItem = menuItemId;
    if (type) filter.type = type;

    const reviews = await Review.find(filter)
      .populate("customer", "name avatar")
      .sort({ createdAt: -1 });

    const avgRating =
      reviews.length > 0
        ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(2)
        : 0;

    res.json({
      success: true,
      count: reviews.length,
      averageRating: parseFloat(avgRating),
      data: reviews,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Public "social proof" feed for the homepage slider.
 * Merges both review surfaces into one normalized shape:
 *   - the Review collection (restaurant / food / delivery reviews)
 *   - order ratings left after delivery (stored on the Order)
 * Only reviews with a written comment are shown; newest first.
 */
export const getFeaturedReviews = async (req, res, next) => {
  try {
    const collectionReviews = await Review.find({ comment: { $exists: true, $ne: "" } })
      .populate("customer", "name avatar")
      .populate("restaurant", "name")
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const orderReviews = await Order.find({ review: { $exists: true, $ne: "" }, rating: { $gte: 1 } })
      .populate("customer", "name avatar")
      .populate("restaurant", "name")
      .sort({ rating: -1, createdAt: -1 })
      .limit(20)
      .lean();

    const normalized = [
      ...collectionReviews.map((r) => ({
        _id: `review-${r._id}`,
        comment: r.comment,
        rating: r.rating,
        customerName: r.customer?.name || "Verified Customer",
        avatar: r.customer?.avatar,
        restaurantName: r.restaurant?.name,
        source: "review",
        createdAt: r.createdAt,
      })),
      ...orderReviews
        .filter((o) => o.review)
        .map((o) => ({
          _id: `order-${o._id}`,
          comment: o.review,
          rating: o.rating,
          customerName: o.customer?.name || "Verified Customer",
          avatar: o.customer?.avatar,
          restaurantName: o.restaurant?.name,
          source: "order",
          createdAt: o.statusUpdates?.length
            ? o.statusUpdates[o.statusUpdates.length - 1].timestamp
            : o.createdAt,
        })),
    ]
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .slice(0, 10);

    res.json({
      success: true,
      count: normalized.length,
      data: normalized,
    });
  } catch (error) {
    next(error);
  }
};

export const updateReview = async (req, res, next) => {
  try {
    const { rating, comment, photos } = req.body;

    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    if (review.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only update your own reviews" });
    }

    review.rating = rating || review.rating;
    review.comment = comment || review.comment;
    review.photos = photos || review.photos;

    await review.save();

    res.json({
      message: "Review updated successfully",
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    if (review.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only delete your own reviews" });
    }

    await Review.findByIdAndDelete(req.params.id);

    res.json({ message: "Review deleted successfully" });
  } catch (error) {
    next(error);
  }
};

export const markHelpful = async (req, res, next) => {
  try {
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { helpful: true },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    res.json({
      message: "Review marked as helpful",
      data: review,
    });
  } catch (error) {
    next(error);
  }
};
