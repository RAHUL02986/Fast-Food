/**
 * Shared UI constants for the admin Delivery Management pages.
 */

export const PARTNER_STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-blue-100 text-blue-800",
  active: "bg-green-100 text-green-800",
  busy: "bg-orange-100 text-orange-800",
  offline: "bg-gray-100 text-gray-700",
  suspended: "bg-red-100 text-red-800",
  rejected: "bg-red-50 text-red-600 border border-red-200",
};

export const DELIVERY_STATUS_STYLES: Record<string, string> = {
  unassigned: "bg-gray-100 text-gray-700",
  assigned: "bg-amber-100 text-amber-800",
  accepted: "bg-blue-100 text-blue-800",
  rejected: "bg-red-100 text-red-800",
  reached_restaurant: "bg-indigo-100 text-indigo-800",
  picked_up: "bg-purple-100 text-purple-800",
  out_for_delivery: "bg-orange-100 text-orange-800",
  delivered: "bg-green-100 text-green-800",
};

export const DELIVERY_STATUS_LABELS: Record<string, string> = {
  unassigned: "Unassigned",
  assigned: "Assigned — awaiting response",
  accepted: "Accepted",
  rejected: "Rejected",
  reached_restaurant: "Reached Restaurant",
  picked_up: "Picked Up",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
};

export const VEHICLE_LABELS: Record<string, string> = {
  bike: "Bike",
  scooter: "Scooter",
  car: "Car",
  bicycle: "Bicycle",
  other: "Other",
};

export const fmt = (n?: number | null) =>
  `₹${(typeof n === "number" ? n : 0).toLocaleString("en-IN")}`;

export const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";

export const fmtDay = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("en-IN", { dateStyle: "medium" }) : "—";

export const addressLine = (address: any) =>
  !address
    ? "—"
    : [address.street, address.city, address.state, address.zip].filter(Boolean).join(", ");