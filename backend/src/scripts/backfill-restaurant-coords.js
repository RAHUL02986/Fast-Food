// One-time data fix: assign coordinates to restaurants created before lat/lng
// capture was added (they currently have no `loc` so the 5km radius search and
// $geoNear can never match them).
//
// Run with:  node src/scripts/backfill-restaurant-coords.js
import "dotenv/config";
import mongoose from "mongoose";
import Restaurant from "../models/Restaurant.js";

// City → approximate center coordinates. Restaurants without coordinates and
// without a city get a fallback to the middle of India.
const CITY_COORDS = {
  mumbai: { lat: 19.076, lng: 72.8777 },
  delhi: { lat: 28.6139, lng: 77.209 },
  bangalore: { lat: 12.9716, lng: 77.5946 },
  dharamshala: { lat: 32.219, lng: 76.3232 },
  hyderabad: { lat: 17.385, lng: 78.4867 },
  pune: { lat: 18.5204, lng: 73.8567 },
  chennai: { lat: 13.0827, lng: 80.2707 },
  kolkata: { lat: 22.5726, lng: 88.3639 },
};
const FALLBACK = { lat: 21.7679, lng: 78.8718 }; // Nagpur (central India)

const cleanCity = (city = "") => city.trim().toLowerCase();

const backfill = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✓ Connected");

  const restaurants = await Restaurant.find({
    $or: [{ latitude: { $exists: false } }, { latitude: null }],
  });

  if (restaurants.length === 0) {
    console.log("No restaurants missing coordinates — nothing to do.");
    process.exit(0);
  }

  let updated = 0;
  for (const r of restaurants) {
    const key = cleanCity(r.city);
    const { lat, lng } = CITY_COORDS[key] || FALLBACK;
    r.latitude = lat;
    r.longitude = lng;
    await r.save(); // pre-save hook keeps `loc` in sync
    console.log(`  ✓ ${r.name} (${r.city || "?"}) → ${lat}, ${lng}`);
    updated += 1;
  }

  console.log(`\nBackfilled coordinates for ${updated} restaurant(s).`);
  await mongoose.disconnect();
  process.exit(0);
};

backfill().catch(async (e) => {
  console.error("✗ Backfill failed:", e.message);
  await mongoose.disconnect();
  process.exit(1);
});