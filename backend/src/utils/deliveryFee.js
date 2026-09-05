import DeliverySettings from "../models/DeliverySettings.js";

/**
 * Delivery pricing helpers — distance measurement, customer-facing fee
 * calculation and the partner/platform fee split.
 */

const EARTH_RADIUS_KM = 6371;

/** Haversine great-circle distance between two coordinates, in km (2 decimals). */
export const haversineKm = (lat1, lng1, lat2, lng2) => {
  const toRad = (deg) => (Number(deg) * Math.PI) / 180;
  if ([lat1, lng1, lat2, lng2].some((v) => v === undefined || v === null || isNaN(Number(v)))) {
    return null;
  }
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const distance = EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(distance * 100) / 100;
};

/** Load the (auto-created) delivery settings document. */
export const getDeliverySettings = async () => {
  let settings = await DeliverySettings.findOne({ key: "delivery" });
  if (!settings) {
    settings = await DeliverySettings.create({ key: "delivery" });
  }
  return settings;
};

/**
 * Customer-facing delivery fee from settings + distance.
 * fee = baseFee + perKmFee × km, clamped to [minFee, maxFee].
 * Returns null when distance is unknown — callers fall back to the
 * restaurant's flat deliveryCharge.
 */
export const calculateDeliveryFee = (settings, distanceKm) => {
  if (distanceKm === null || distanceKm === undefined || isNaN(distanceKm)) {
    return null;
  }
  const raw =
    Number(settings.baseFee) + Number(settings.perKmFee) * Number(distanceKm);
  const fee = Math.min(Math.max(Math.round(raw), settings.minFee), settings.maxFee);
  return fee;
};

/**
 * Split a delivery fee between the delivery partner and the platform,
 * according to the configured partner commission mode.
 * Returns { partnerEarning, adminEarning } — admin keeps the remainder,
 * never negative.
 */
export const splitDeliveryFee = (settings, fee, distanceKm) => {
  let partnerEarning = 0;
  switch (settings.partnerCommissionMode) {
    case "fixed":
      partnerEarning = Number(settings.partnerFixedAmount) || 0;
      break;
    case "distance": {
      const distanceAmount = Number(settings.perKmFee) * Number(distanceKm || 0);
      partnerEarning = Math.round(distanceAmount);
      break;
    }
    case "percentage":
    default:
      partnerEarning = Math.round(
        (Number(fee) * Number(settings.partnerCommissionPercent)) / 100
      );
      break;
  }
  // Partner can never earn more than the customer paid for delivery
  partnerEarning = Math.min(Math.max(partnerEarning, 0), Number(fee));
  const adminEarning = Math.max(Number(fee) - partnerEarning, 0);
  return { partnerEarning, adminEarning };
};

/**
 * Compute the full fee breakdown for an order at assignment time.
 * Prefers the distance-based fee when coordinates allow; otherwise uses the
 * order's existing deliveryCharge and still splits it per settings.
 */
export const computeFeeBreakdown = async ({
  settings,
  orderDeliveryCharge,
  distanceKm,
}) => {
  const distanceFee = calculateDeliveryFee(settings, distanceKm);
  const fee =
    distanceFee !== null && distanceFee > 0
      ? distanceFee
      : Number(orderDeliveryCharge) || 0;
  const { partnerEarning, adminEarning } = splitDeliveryFee(settings, fee, distanceKm);
  return { fee, partnerEarning, adminEarning, distanceKm: distanceKm ?? null };
};