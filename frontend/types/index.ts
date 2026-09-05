/**
 * Shared domain types — mirrors backend/src/models/*.js.
 * Relation fields are unions (`User | string`) because the API populates some
 * refs per-endpoint (see docs/API.md) — e.g. GET /orders/:id populates
 * items.menuItem while GET /orders returns raw ObjectIds.
 */

<<<<<<< HEAD
export type Role = "customer" | "owner" | "admin" | "delivery_partner";
=======
export type Role = "customer" | "owner" | "admin";
>>>>>>> 1ed4806eca017c48e5ffc19d534dbae1fea1c856

export interface SavedAddress {
  label?: string;
  line: string;
  city?: string;
  zip?: string;
  phone?: string;
  isDefault?: boolean;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string;
<<<<<<< HEAD
  /** bcrypt hash — only populated on admin-only endpoints (never on auth responses) */
  password?: string;
=======
>>>>>>> 1ed4806eca017c48e5ffc19d534dbae1fea1c856
  avatar?: string;
  address?: string;
  city?: string;
  addresses?: SavedAddress[];
  isActive?: boolean;
<<<<<<< HEAD
  /** Delivery partner flags (partners are "customer"-role users) */
  isDeliveryPartner?: boolean;
  isAvailable?: boolean;
  currentLocation?: { lat: number; lng: number } | null;
=======
>>>>>>> 1ed4806eca017c48e5ffc19d534dbae1fea1c856
  createdAt?: string;
  updatedAt?: string;
}

export interface Restaurant {
  _id: string;
  owner?: User | string;
  name: string;
  description?: string;
  cuisine?: string[];
  location?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  status?: "pending" | "approved" | "rejected";
  rejectionReason?: string;
  rating?: number;
  reviewCount?: number;
  openingTime?: string;
  closingTime?: string;
  isOpen?: boolean;
  deliveryTime?: number;
  minOrderValue?: number;
  deliveryCharge?: number;
  photos?: string[];
  banner?: string;
  verified?: boolean;
  documents?: { licenseNumber?: string; licenseExpiry?: string; gstin?: string };
  isActive?: boolean;
  suspendedReason?: string;
<<<<<<< HEAD
  /** Distance from the searched location, in km — only on `/restaurants/nearby` */
  distanceKm?: number;
=======
>>>>>>> 1ed4806eca017c48e5ffc19d534dbae1fea1c856
  createdAt?: string;
  updatedAt?: string;
}

export interface MenuItem {
  _id: string;
  restaurant?: string | Restaurant;
  name: string;
  description?: string;
  price: number;
  originalPrice?: number;
  category: string;
  image?: string;
  isVeg?: boolean;
  isSpicy?: boolean;
  isAvailable?: boolean;
  preparationTime?: number;
  rating?: number;
  reviewCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export type OrderType = "delivery" | "dine-in";
export type OrderStatus =
  | "placed"
  | "confirmed"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "delivered"
  | "served"
  | "cancelled";

<<<<<<< HEAD
/** Granular delivery lifecycle (the 10-step flow) — lives on Order.delivery.status */
export type DeliveryStatus =
  | "unassigned"
  | "assigned"
  | "accepted"
  | "rejected"
  | "reached_restaurant"
  | "picked_up"
  | "out_for_delivery"
  | "delivered";

export interface DeliveryInfo {
  status?: DeliveryStatus;
  assignedBy?: string | User;
  assignedAt?: string;
  acceptedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  pickupStartedAt?: string;
  reachedRestaurantAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  fee?: number;
  partnerEarning?: number;
  adminEarning?: number;
  distanceKm?: number | null;
  trackingEnabled?: boolean;
}

export interface AssignmentHistoryEntry {
  partner?: string | User;
  assignedBy?: string | User;
  assignedAt?: string;
  outcome?: "assigned" | "accepted" | "rejected" | "completed";
  reason?: string;
}

=======
>>>>>>> 1ed4806eca017c48e5ffc19d534dbae1fea1c856
export interface OrderItem {
  /** Raw ObjectId on list endpoints, populated MenuItem on GET /orders/:id */
  menuItem?: MenuItem | string;
  quantity?: number;
  price?: number;
  specialInstructions?: string;
  /** Cart-side display name (not stored server-side) */
  name?: string;
}

export interface DeliveryAddress {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  latitude?: number;
  longitude?: number;
}

export interface Table {
  _id: string;
  restaurant?: string | Restaurant;
  name: string;
  capacity?: number;
  status?: "free" | "occupied" | "reserved" | "inactive";
  qrCode?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface TableSlot {
  _id: string;
  restaurant?: string | Restaurant;
  table?: Table | string | null;
  date: string;
  startTime?: string;
  endTime?: string;
  capacity: number;
  booked?: number;
  price?: number;
  isActive?: boolean;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Booking {
  _id: string;
  bookingNumber?: string;
  bookingCode?: string;
  customer?: User | string;
  restaurant?: Restaurant | string;
  slot?: TableSlot | string;
  table?: Table | string | null;
  partySize: number;
  specialRequests?: string;
  status?: "confirmed" | "cancelled" | "completed" | "no-show";
  /** Server-computed advance: ₹200 base (2 guests) + ₹50 per extra guest */
  advanceAmount?: number;
  advancePaymentMethod?: "card" | "upi" | "wallet";
  advanceStatus?: "paid" | "refunded";
  /** 50% of advanceAmount, set when the booking is cancelled */
  refundAmount?: number;
  guestName?: string;
  guestPhone?: string;
  guestEmail?: string;
  cancellationReason?: string;
  cancellationTime?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Order {
  _id: string;
  orderNumber?: string;
  customer?: User | string;
  restaurant?: Restaurant;
  items?: OrderItem[];
  subtotal?: number;
  deliveryCharge?: number;
  tax?: number;
  total?: number;
  paymentMethod?: "card" | "wallet" | "cash" | "upi";
  paymentStatus?: "pending" | "completed" | "failed";
  paymentId?: string;
  type: OrderType;
  table?: Table | null;
  booking?: Booking | string | null;
  deliveryAddress?: DeliveryAddress;
  specialInstructions?: string;
  status: OrderStatus;
  statusUpdates?: { status: string; timestamp: string; note?: string }[];
<<<<<<< HEAD
  delivery?: DeliveryInfo;
  assignmentHistory?: AssignmentHistoryEntry[];
  estimatedDeliveryTime?: string;
  actualDeliveryTime?: string;
  deliveryPartner?: User | string | null;
=======
  estimatedDeliveryTime?: string;
  actualDeliveryTime?: string;
>>>>>>> 1ed4806eca017c48e5ffc19d534dbae1fea1c856
  rating?: number;
  review?: string;
  cancelReason?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FeaturedReview {
  _id: string;
  comment: string;
  rating: number;
  customerName: string;
  avatar?: string;
  restaurantName?: string;
  source: "review" | "order";
  createdAt?: string;
}

export interface Review {
  _id: string;
  customer?: User | string;
  restaurant?: string | Restaurant;
  order?: string | Order;
  menuItem?: string | MenuItem;
  type: "restaurant" | "food" | "delivery";
  rating: number;
  comment?: string;
  photos?: string[];
  likes?: number;
  helpful?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Notification {
  _id: string;
  user?: string | User;
<<<<<<< HEAD
  type: "order" | "booking" | "restaurant" | "promo" | "system" | "delivery";
=======
  type: "order" | "booking" | "restaurant" | "promo" | "system";
>>>>>>> 1ed4806eca017c48e5ffc19d534dbae1fea1c856
  title?: string;
  message?: string;
  data?: Record<string, unknown>;
  read: boolean;
  readAt?: string;
  relatedId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Report {
  _id: string;
  customer?: User | string;
  restaurant?: Restaurant | string;
  order?: Order | string;
  category?: "order" | "food-quality" | "delivery" | "booking" | "staff" | "other";
  subject: string;
  description: string;
  status?: "open" | "reviewing" | "resolved" | "dismissed";
  adminNotes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DailySummary {
  date: string;
  ordersToday: number;
  revenueToday: number;
  deliveryOrders: number;
  dineInOrders: number;
  activeOrders: number;
  bookingsToday: number;
  statusBreakdown: { _id: string; count: number }[];
}

/* ---------- API response shapes ---------- */

export interface ApiEnvelope<T> {
  success?: boolean;
  message?: string;
  count?: number;
  total?: number;
  unreadCount?: number;
  data: T;
}

export type ApiList<T> = ApiEnvelope<T[]>;

<<<<<<< HEAD
export interface TrackData {
  orderNumber?: string;
  status?: string;
  restaurant?: { _id?: string; name?: string; latitude?: number; longitude?: number } | string | null;
  deliveryAddress?: DeliveryAddress;
  statusUpdates?: { status?: string; timestamp?: string; note?: string }[];
  estimatedDeliveryTime?: string;
  actualDeliveryTime?: string;
  deliveryPartner?: {
    name?: string;
    phone?: string;
    location?: { lat?: number; lng?: number } | null;
  } | null;
}

=======
>>>>>>> 1ed4806eca017c48e5ffc19d534dbae1fea1c856
export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}
<<<<<<< HEAD

/* ---------- Delivery partner management ---------- */

export type PartnerStatus =
  | "pending"
  | "approved"
  | "active"
  | "busy"
  | "offline"
  | "suspended"
  | "rejected";

export type VehicleType = "bike" | "scooter" | "car" | "bicycle" | "other";

export interface DeliveryPartnerProfile {
  _id: string;
  user?: User | string;
  vehicleType?: VehicleType;
  vehicleNumber?: string;
  address?: string;
  city?: string;
  idDocument?: string;
  status?: PartnerStatus;
  rejectionReason?: string;
  suspendedReason?: string;
  approvedAt?: string;
  approvedBy?: string | User;
  locationPermission?: boolean;
  totalDeliveries?: number;
  completedDeliveries?: number;
  cancelledDeliveries?: number;
  totalEarnings?: number;
  lastActiveAt?: string;
  createdAt?: string;
  updatedAt?: string;
  /** Computed by the admin list endpoint */
  activeDeliveries?: number;
  pendingPayout?: number;
}

export interface AvailablePartner extends DeliveryPartnerProfile {
  user: User;
  distanceFromRestaurant?: number | null;
  distanceToCustomer?: number | null;
  isAvailable?: boolean;
  /** Live location pushed by the partner while tracking is active. */
  currentLocation?: { lat?: number; lng?: number } | null;
}

export interface DeliveryEarningRecord {
  _id: string;
  partner?: string | User;
  order?: string | Order;
  orderNumber?: string;
  totalDeliveryCharge?: number;
  partnerEarning?: number;
  adminEarning?: number;
  status?: "pending" | "paid";
  payout?: string | PayoutRecord;
  paidAt?: string;
  completedAt?: string;
  createdAt?: string;
}

export interface PayoutRecord {
  _id: string;
  partner?: string | User;
  amount?: number;
  earnings?: string[];
  deliveryCount?: number;
  status?: "pending" | "completed";
  method?: string;
  reference?: string;
  note?: string;
  createdBy?: string | User;
  processedAt?: string;
  createdAt?: string;
}

export interface WalletData {
  availableBalance?: number;
  pendingEarnings?: number;
  paidEarnings?: number;
  totalEarnings?: number;
  completedDeliveries?: number;
  payouts?: PayoutRecord[];
}

export type PartnerCommissionMode = "fixed" | "percentage" | "distance";

export interface DeliverySettingsData {
  _id?: string;
  key?: string;
  baseFee?: number;
  perKmFee?: number;
  minFee?: number;
  maxFee?: number;
  partnerCommissionMode?: PartnerCommissionMode;
  partnerFixedAmount?: number;
  partnerCommissionPercent?: number;
  platformCommissionPercent?: number;
}

export interface DeliveryOverviewStats {
  partners: {
    total?: number;
    pending?: number;
    active?: number;
    available?: number;
    suspended?: number;
  };
  ordersWaitingForAssignment?: number;
  activeDeliveries?: number;
  completedToday?: number;
  totalDeliveryRevenue?: number;
  partnerEarnings?: number;
  adminEarnings?: number;
  totalDeliveryCharges?: number;
  completedDeliveries?: number;
}

export interface PartnerRegistrationPayload {
  name: string;
  email: string;
  password: string;
  phone: string;
  avatar?: string;
  vehicleType: VehicleType;
  vehicleNumber: string;
  address: string;
  city: string;
  idDocument?: string;
}
=======
>>>>>>> 1ed4806eca017c48e5ffc19d534dbae1fea1c856
