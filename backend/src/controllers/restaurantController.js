import Restaurant from "../models/Restaurant.js";
import { createNotification } from "../utils/notificationService.js";

/** Escape user input before embedding it in a RegExp. */
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const getAllRestaurants = async (req, res, next) => {
  try {
    const { search, cuisine, city, sortBy = "-rating" } = req.query;

    const filter = { status: "approved" };
    const and = [];

    // Free-text search matches name, cuisine, city AND street location
    if (search) {
      const rx = new RegExp(escapeRegex(search), "i");
      and.push({
        $or: [{ name: rx }, { cuisine: rx }, { city: rx }, { location: rx }],
      });
    }

    if (cuisine) {
      filter.cuisine = cuisine;
    }

    // "City / Location" filter matches the city field OR the street location
    if (city) {
      const rx = new RegExp(escapeRegex(city), "i");
      and.push({ $or: [{ city: rx }, { location: rx }] });
    }

    if (and.length) filter.$and = and;

    const restaurants = await Restaurant.find(filter)
      .populate("owner", "name phone")
      .sort(sortBy)
      .lean();

    res.json({
      success: true,
      count: restaurants.length,
      data: restaurants,
    });
  } catch (error) {
    next(error);
  }
};

export const getRestaurantById = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id).populate(
      "owner",
      "name phone email"
    );

    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    res.json({
      success: true,
      data: restaurant,
    });
  } catch (error) {
    next(error);
  }
};

export const createRestaurant = async (req, res, next) => {
  try {
    const restaurantData = {
      ...req.body,
      owner: req.user._id,
    };

    const restaurant = new Restaurant(restaurantData);
    await restaurant.save();

    await createNotification(req.user._id, {
      type: "restaurant",
      title: "Restaurant Registration",
      message: "Your restaurant registration is under review. We will notify you once approved.",
      relatedId: restaurant._id,
    });

    res.status(201).json({
      message: "Restaurant created successfully. Awaiting admin approval.",
      data: restaurant,
    });
  } catch (error) {
    next(error);
  }
};

export const updateRestaurant = async (req, res, next) => {
  try {
    // Admins may edit any restaurant (e.g. fixing seeded data); owners only their own
    const scope =
      req.user.role === "admin"
        ? { _id: req.params.id }
        : { _id: req.params.id, owner: req.user._id };
    const restaurant = await Restaurant.findOne(scope);

    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    // Prevent status and verification changes by owner
    const { status, verified, ...updateData } = req.body;

    // Validate coordinates when provided (keeps the 5km geo search accurate)
    if (updateData.latitude === "") delete updateData.latitude;
    if (updateData.longitude === "") delete updateData.longitude;
    if (updateData.latitude !== undefined) {
      const lat = Number(updateData.latitude);
      if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
        return res.status(400).json({ message: "latitude must be a number between -90 and 90" });
      }
      updateData.latitude = lat;
    }
    if (updateData.longitude !== undefined) {
      const lng = Number(updateData.longitude);
      if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
        return res.status(400).json({ message: "longitude must be a number between -180 and 180" });
      }
      updateData.longitude = lng;
    }

    Object.assign(restaurant, updateData);
    await restaurant.save();

    res.json({
      message: "Restaurant updated successfully",
      data: restaurant,
    });
  } catch (error) {
    next(error);
  }
};

export const getOwnerRestaurant = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findOne({ owner: req.user._id });

    if (!restaurant) {
      return res.status(404).json({ message: "No restaurant found for this owner" });
    }

    res.json({
      success: true,
      data: restaurant,
    });
  } catch (error) {
    next(error);
  }
};

// Admin endpoints
export const getPendingRestaurants = async (req, res, next) => {
  try {
    const restaurants = await Restaurant.find({ status: "pending" })
      .populate("owner", "name email phone")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: restaurants.length,
      data: restaurants,
    });
  } catch (error) {
    next(error);
  }
};

export const approveRestaurant = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      { status: "approved", verified: true },
      { new: true }
    );

    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    await createNotification(restaurant.owner, {
      type: "restaurant",
      title: "Restaurant Approved",
      message: `Your restaurant "${restaurant.name}" has been approved and is now live!`,
      relatedId: restaurant._id,
    });

    res.json({
      message: "Restaurant approved successfully",
      data: restaurant,
    });
  } catch (error) {
    next(error);
  }
};

export const rejectRestaurant = async (req, res, next) => {
  try {
    const { reason } = req.body;

    const restaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      { status: "rejected", rejectionReason: reason },
      { new: true }
    );

    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    await createNotification(restaurant.owner, {
      type: "restaurant",
      title: "Restaurant Registration Rejected",
      message: `Your restaurant registration was rejected. Reason: ${reason}`,
      relatedId: restaurant._id,
    });

    res.json({
      message: "Restaurant rejected",
      data: restaurant,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllRestaurantsAdmin = async (req, res, next) => {
  try {
    const { status, city, search } = req.query;

    const filter = {};

    if (status) filter.status = status;
    if (city) filter.city = new RegExp(city, "i");
    if (search) {
      filter.$or = [
        { name: new RegExp(search, "i") },
        { "owner.name": new RegExp(search, "i") },
      ];
    }

    // .lean() skips the User schema's toJSON(), so `password` must be excluded
    // from the populate explicitly — bcrypt hashes must never reach the browser.
    const restaurants = await Restaurant.find(filter)
      .populate("owner", "name email phone")
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      count: restaurants.length,
      data: restaurants,
    });
  } catch (error) {
    next(error);
  }
};

// ---------- Location-based search (5km radius) ----------

/** Haversine distance in kilometers between two lat/lng points. */
export const haversineKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth radius in km
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * GET /restaurants/nearby?lat=..&lng=..&radius=5&search=..&cuisine=..
 * Returns approved, active restaurants within `radius` km (default 5),
 * sorted nearest-first, each with a `distanceKm` field.
 * Falls back to a manual haversine filter when a restaurant lacks `loc`
 * (data seeded before the geospatial field was added).
 */
export const getNearbyRestaurants = async (req, res, next) => {
  try {
    const { lat, lng, radius = 5, search, cuisine } = req.query;
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);

    if (isNaN(latNum) || isNaN(lngNum)) {
      return res.status(400).json({ message: "lat and lng are required" });
    }

    const radiusKm = parseFloat(radius) || 5;

    // Base filter: approved + not suspended
    const baseFilter = { status: "approved", isActive: { $ne: false } };
    if (search) {
      const rx = new RegExp(escapeRegex(search), "i");
      baseFilter.$or = [
        { name: rx },
        { cuisine: rx },
        { city: rx },
        { location: rx },
      ];
    }
    if (cuisine) baseFilter.cuisine = cuisine;

    let restaurants = await Restaurant.aggregate([
      {
        $geoNear: {
          near: { type: "Point", coordinates: [lngNum, latNum] },
          distanceField: "distanceMeters",
          maxDistance: radiusKm * 1000,
          spherical: true,
          query: baseFilter,
        },
      },
      { $sort: { distanceMeters: 1 } },
    ]);

    const docs = await Restaurant.populate(restaurants, {
      path: "owner",
      select: "name phone",
    });

    const data = docs.map((r) => ({
      ...r,
      distanceKm: +(r.distanceMeters / 1000).toFixed(2),
      distanceMeters: undefined, // keep payload lean
    }));

    res.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    // If the geospatial index is missing (e.g. fresh DB before index build),
    // fall back to a plain filter + haversine sort.
    if (error && error.codeName === "IndexNotFound") {
      try {
        const { lat, lng, radius = 5, search, cuisine } = req.query;
        const latNum = parseFloat(lat);
        const lngNum = parseFloat(lng);
        const radiusKm = parseFloat(radius) || 5;

        const baseFilter = { status: "approved", isActive: { $ne: false } };
        if (search) {
          const rx = new RegExp(escapeRegex(search), "i");
          baseFilter.$or = [
            { name: rx },
            { cuisine: rx },
            { city: rx },
            { location: rx },
          ];
        }
        if (cuisine) baseFilter.cuisine = cuisine;

        const list = await Restaurant.find(baseFilter)
          .populate("owner", "name phone")
          .lean();

        const data = list
          .map((r) => {
            const lat2 = r.latitude ?? r.loc?.coordinates?.[1];
            const lon2 = r.longitude ?? r.loc?.coordinates?.[0];
            if (lat2 === undefined || lon2 === undefined) return null;
            const distanceKm = haversineKm(latNum, lngNum, lat2, lon2);
            return { ...r, distanceKm: +distanceKm.toFixed(2) };
          })
          .filter(Boolean)
          .filter((r) => r.distanceKm <= radiusKm)
          .sort((a, b) => a.distanceKm - b.distanceKm);

        return res.json({ success: true, count: data.length, data });
      } catch (fallbackError) {
        return next(fallbackError);
      }
    }
    next(error);
  }
};
