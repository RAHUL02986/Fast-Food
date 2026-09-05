// Temp DB inspection — deleted after use
import dotenv from "dotenv";
const mongoose = (await import("mongoose")).default;
await mongoose.connect("mongodb://127.0.0.1:27017/quick-food-verify");
const Review = (await import("./src/models/Review.js")).default;
const Order = (await import("./src/models/Order.js")).default;
const r = await Review.countDocuments({ comment: { $exists: true, $ne: "" } });
const o = await Order.countDocuments({ review: { $exists: true, $ne: "" }, rating: { $gte: 1 } });
console.log("review-collection comments:", r, "| orders-with-reviews:", o);
await mongoose.disconnect();