import "dotenv/config";
import mongoose from "mongoose";
import Restaurant from "./src/models/Restaurant.js";
import User from "./src/models/User.js";

await mongoose.connect(process.env.MONGODB_URI);

const restaurants = await Restaurant.find({})
  .select("name city location status latitude longitude loc isActive owner")
  .lean();

console.log("=== ALL RESTAURANTS ===");
for (const r of restaurants) {
  console.log(
    [
      r.name,
      `city=${JSON.stringify(r.city)}`,
      `location=${JSON.stringify(r.location)}`,
      `status=${r.status}`,
      `lat=${r.latitude}`,
      `lng=${r.longitude}`,
      `hasLoc=${!!r.loc?.coordinates?.length}`,
      `active=${r.isActive}`,
    ].join(" | ")
  );
}

const owners = await User.find({ role: "owner" })
  .select("name email city address addresses")
  .lean();
console.log("\n=== OWNERS ===");
for (const o of owners) {
  console.log(
    [
      o.name,
      o.email,
      `city=${JSON.stringify(o.city)}`,
      `address=${JSON.stringify(o.address)}`,
      `savedAddresses=${JSON.stringify((o.addresses || []).map((a) => `${a.label}:${a.line}:${a.city}`))}`,
    ].join(" | ")
  );
}

await mongoose.disconnect();
