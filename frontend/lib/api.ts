import type {
  ApiEnvelope,
  ApiList,
  AuthResponse,
<<<<<<< HEAD
  AvailablePartner,
  Booking,
  DailySummary,
  DeliveryEarningRecord,
  DeliveryOverviewStats,
  DeliveryPartnerProfile,
  DeliverySettingsData,
=======
  Booking,
  DailySummary,
>>>>>>> 1ed4806eca017c48e5ffc19d534dbae1fea1c856
  FeaturedReview,
  MenuItem,
  Notification,
  Order,
<<<<<<< HEAD
  PayoutRecord,
=======
>>>>>>> 1ed4806eca017c48e5ffc19d534dbae1fea1c856
  Report,
  Restaurant,
  Review,
  Table,
  TableSlot,
<<<<<<< HEAD
  TrackData,
  User,
  WalletData,
=======
  User,
>>>>>>> 1ed4806eca017c48e5ffc19d534dbae1fea1c856
} from "@/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

type ApiParams = Record<string, string | number | boolean | undefined>;
type ApiPayload = Record<string, unknown>;

/** Error thrown by apiCall — includes the HTTP status (0 = network failure). */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const buildQuery = (params: ApiParams = {}) =>
  new URLSearchParams(
    Object.entries(params)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, String(value)])
  ).toString();

export const apiCall = async <T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch {
    // fetch only throws for network-level failures (backend down, DNS, aborted…)
    throw new ApiError(
      "Cannot reach the Quick Food API. Is the backend running on port 4000?",
      0
    );
  }

  // The body may not be JSON (proxy error pages, HTML crash pages, empty bodies…)
  let body: Record<string, unknown> = {};
  try {
    body = await response.json();
  } catch {
    /* non-JSON response — handled via the status check below */
  }

  if (!response.ok) {
    if (response.status === 401 && token) {
      // Expired/invalid session — drop the stale token so the app treats the user as logged out
      localStorage.removeItem("token");
    }
    throw new ApiError(
      (body.message as string) ||
        (response.status === 401
          ? "Session expired. Please log in again."
          : `Request failed (${response.status})`),
      response.status
    );
  }

  return body as T;
};

// Auth API
export const authAPI = {
  signup: (payload: ApiPayload) => apiCall<AuthResponse>("/auth/signup", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload: ApiPayload) => apiCall<AuthResponse>("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  // otp is only present in the response when the backend runs with NODE_ENV !== "production"
  requestOtp: (payload: ApiPayload) =>
    apiCall<{ message: string; otp?: string; identifier?: string }>("/auth/otp/request", { method: "POST", body: JSON.stringify(payload) }),
  verifyOtp: (payload: ApiPayload) => apiCall<AuthResponse>("/auth/otp/verify", { method: "POST", body: JSON.stringify(payload) }),
  // NOTE: returns the raw user object (no envelope)
  getProfile: () => apiCall<User>("/auth/profile"),
  updateProfile: (payload: ApiPayload) =>
    apiCall<{ message: string; user: User }>("/auth/profile", { method: "PUT", body: JSON.stringify(payload) }),
  // NOTE: returns raw { valid, user }
  verifyToken: () => apiCall<{ valid: boolean; user: User }>("/auth/verify"),
};

// Restaurant API
export const restaurantAPI = {
  getAllRestaurants: (params: ApiParams = {}) => apiCall<ApiList<Restaurant>>(`/restaurants?${buildQuery(params)}`),
<<<<<<< HEAD
  /** Location-based search — returns approved restaurants within `radius` km sorted nearest-first. */
  getNearbyRestaurants: (params: ApiParams = {}) => apiCall<ApiList<Restaurant>>(`/restaurants/nearby?${buildQuery(params)}`),
=======
>>>>>>> 1ed4806eca017c48e5ffc19d534dbae1fea1c856
  getRestaurantById: (id: string) => apiCall<ApiEnvelope<Restaurant>>(`/restaurants/${id}`),
  createRestaurant: (payload: ApiPayload) => apiCall<ApiEnvelope<Restaurant>>("/restaurants", { method: "POST", body: JSON.stringify(payload) }),
  updateRestaurant: (id: string, payload: ApiPayload) =>
    apiCall<ApiEnvelope<Restaurant>>(`/restaurants/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  getOwnerRestaurant: () => apiCall<ApiEnvelope<Restaurant | null>>("/restaurants/owner/my-restaurant"),
<<<<<<< HEAD
  /** Admin-only: lists every restaurant (any status) with the owner populated incl. email */
  getAllRestaurantsAdmin: (params: ApiParams = {}) =>
    apiCall<ApiList<Restaurant>>("/restaurants/admin/all?" + buildQuery(params)),
=======
>>>>>>> 1ed4806eca017c48e5ffc19d534dbae1fea1c856
  getPendingRestaurants: () => apiCall<ApiList<Restaurant>>("/restaurants/pending/list"),
  approveRestaurant: (id: string) => apiCall<ApiEnvelope<Restaurant>>(`/restaurants/${id}/approve`, { method: "PATCH" }),
  rejectRestaurant: (id: string, payload: ApiPayload) =>
    apiCall<ApiEnvelope<Restaurant>>(`/restaurants/${id}/reject`, { method: "PATCH", body: JSON.stringify(payload) }),
};

// Menu API
export const menuAPI = {
  getMenuItems: (restaurantId: string, params: ApiParams = {}) =>
    apiCall<ApiList<MenuItem>>(`/restaurants/${restaurantId}/menu?${buildQuery(params)}`),
  createMenuItem: (restaurantId: string, payload: ApiPayload) =>
    apiCall<ApiEnvelope<MenuItem>>(`/restaurants/${restaurantId}/menu`, { method: "POST", body: JSON.stringify(payload) }),
  updateMenuItem: (restaurantId: string, id: string, payload: ApiPayload) =>
    apiCall<ApiEnvelope<MenuItem>>(`/restaurants/${restaurantId}/menu/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteMenuItem: (restaurantId: string, id: string) =>
    apiCall<{ message: string }>(`/restaurants/${restaurantId}/menu/${id}`, { method: "DELETE" }),
  toggleAvailability: (restaurantId: string, id: string, payload: ApiPayload) =>
    apiCall<ApiEnvelope<MenuItem>>(`/restaurants/${restaurantId}/menu/${id}/availability`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  getCategories: (restaurantId: string) =>
    apiCall<ApiEnvelope<string[]>>(`/restaurants/${restaurantId}/menu/restaurant/${restaurantId}/categories`),
};

// Order API
export const orderAPI = {
  createOrder: (payload: ApiPayload) => apiCall<ApiEnvelope<Order>>("/orders", { method: "POST", body: JSON.stringify(payload) }),
  getOrders: (params: ApiParams = {}) => apiCall<ApiList<Order>>(`/orders?${buildQuery(params)}`),
  getOrderById: (id: string) => apiCall<ApiEnvelope<Order>>(`/orders/${id}`),
  updateOrderStatus: (id: string, payload: ApiPayload) =>
    apiCall<ApiEnvelope<Order>>(`/orders/${id}/status`, { method: "PATCH", body: JSON.stringify(payload) }),
  rejectOrder: (id: string, payload: ApiPayload) =>
    apiCall<ApiEnvelope<Order>>(`/orders/${id}/reject`, { method: "PATCH", body: JSON.stringify(payload) }),
  getDailySummary: () => apiCall<ApiEnvelope<DailySummary>>("/orders/daily-summary"),
  cancelOrder: (id: string, payload: ApiPayload) =>
    apiCall<ApiEnvelope<Order>>(`/orders/${id}/cancel`, { method: "PATCH", body: JSON.stringify(payload) }),
  rateOrder: (id: string, payload: ApiPayload) => apiCall<ApiEnvelope<Order>>(`/orders/${id}/rate`, { method: "POST", body: JSON.stringify(payload) }),
<<<<<<< HEAD
  /** Live tracking info for an order — customer/owner/admin (auth required). */
  trackOrder: (id: string) => apiCall<ApiEnvelope<TrackData>>(`/orders/${id}/track`),
  // Delivery partner endpoints
  getAvailableDeliveryOrders: () => apiCall<ApiList<Order>>("/orders/delivery-partner/available"),
  getMyDeliveryOrders: () => apiCall<ApiList<Order>>("/orders/delivery-partner/my"),
  acceptDeliveryOrder: (id: string) => apiCall<ApiEnvelope<Order>>(`/orders/${id}/accept`, { method: "PATCH" }),
  updateOrderLocation: (id: string, payload: ApiPayload) =>
    apiCall<{ message: string; data: { lat: number; lng: number } }>(`/orders/${id}/location`, { method: "PATCH", body: JSON.stringify(payload) }),
  markOrderDelivered: (id: string) => apiCall<ApiEnvelope<Order>>(`/orders/${id}/delivered`, { method: "PATCH" }),
=======
>>>>>>> 1ed4806eca017c48e5ffc19d534dbae1fea1c856
};

// Booking API
export const bookingAPI = {
  createBooking: (payload: ApiPayload) => apiCall<ApiEnvelope<Booking>>("/bookings", { method: "POST", body: JSON.stringify(payload) }),
  getBookings: (params: ApiParams = {}) => apiCall<ApiList<Booking>>(`/bookings?${buildQuery(params)}`),
  getBookingById: (id: string) => apiCall<ApiEnvelope<Booking>>(`/bookings/${id}`),
  cancelBooking: (id: string, payload: ApiPayload) =>
    apiCall<ApiEnvelope<Booking>>(`/bookings/${id}/cancel`, { method: "PATCH", body: JSON.stringify(payload) }),
  rescheduleBooking: (id: string, payload: ApiPayload) =>
    apiCall<ApiEnvelope<Booking>>(`/bookings/${id}/reschedule`, { method: "PATCH", body: JSON.stringify(payload) }),
  updateBookingStatus: (id: string, payload: ApiPayload) =>
    apiCall<ApiEnvelope<Booking>>(`/bookings/${id}/status`, { method: "PATCH", body: JSON.stringify(payload) }),
  getAvailableSlots: (params: ApiParams = {}) => apiCall<ApiList<TableSlot>>(`/bookings/available-slots?${buildQuery(params)}`),
};

// Table API (owner management + public QR resolution)
export const tableAPI = {
  resolveByCode: (code: string) => apiCall<ApiEnvelope<{ table: Table; restaurant: Restaurant }>>(`/tables/qr/${code}`),
  getTableOrders: (tableId: string, all = false) =>
    apiCall<ApiList<Order>>(`/tables/${tableId}/orders${all ? "?all=true" : ""}`),
  getTables: () => apiCall<ApiList<Table>>("/tables"),
  createTable: (payload: ApiPayload) => apiCall<ApiEnvelope<Table>>("/tables", { method: "POST", body: JSON.stringify(payload) }),
  updateTable: (id: string, payload: ApiPayload) =>
    apiCall<ApiEnvelope<Table>>(`/tables/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  setTableStatus: (id: string, payload: ApiPayload) =>
    apiCall<ApiEnvelope<Table>>(`/tables/${id}/status`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteTable: (id: string) => apiCall<{ message: string }>(`/tables/${id}`, { method: "DELETE" }),
};

// Slot API (owner management)
export const slotAPI = {
  createSlots: (payload: ApiPayload) => apiCall<ApiList<TableSlot>>("/slots", { method: "POST", body: JSON.stringify(payload) }),
  getSlots: (params: ApiParams = {}) => apiCall<ApiList<TableSlot>>(`/slots?${buildQuery(params)}`),
  deleteSlot: (id: string) => apiCall<{ message: string }>(`/slots/${id}`, { method: "DELETE" }),
};

// Admin API (read-only oversight + moderation)
export const adminAPI = {
<<<<<<< HEAD
  /** Admin sets a NEW password for a user (existing hashes can never be revealed) */
  resetUserPassword: (userId: string, newPassword: string) =>
    apiCall<{ success: boolean; message: string }>(`/admin/users/${userId}/reset-password`, {
      method: "PATCH",
      body: JSON.stringify({ newPassword }),
    }),

  generateInvite: () =>
    apiCall<{ message: string; data: { code: string; expiresAt: string } }>("/admin/invites/generate", { method: "POST" }),
=======
>>>>>>> 1ed4806eca017c48e5ffc19d534dbae1fea1c856
  getCustomers: (params: ApiParams = {}) => apiCall<ApiList<User>>(`/admin/customers?${buildQuery(params)}`),
  setUserActive: (id: string, payload: ApiPayload) =>
    apiCall<ApiEnvelope<User>>(`/admin/customers/${id}/active`, { method: "PATCH", body: JSON.stringify(payload) }),
  setRestaurantActive: (id: string, payload: ApiPayload) =>
    apiCall<ApiEnvelope<Restaurant>>(`/admin/restaurants/${id}/active`, { method: "PATCH", body: JSON.stringify(payload) }),
  getBookings: (params: ApiParams = {}) => apiCall<ApiList<Booking>>(`/admin/bookings?${buildQuery(params)}`),
  getReports: (params: ApiParams = {}) => apiCall<ApiList<Report>>(`/admin/reports?${buildQuery(params)}`),
  updateReport: (id: string, payload: ApiPayload) =>
    apiCall<ApiEnvelope<Report>>(`/admin/reports/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
};

// Report API (customer files a complaint)
export const reportAPI = {
  createReport: (payload: ApiPayload) => apiCall<ApiEnvelope<Report>>("/admin/reports", { method: "POST", body: JSON.stringify(payload) }),
};

// Upload API (authenticated image upload)
export const uploadAPI = {
  uploadImage: async (file: File): Promise<{ url: string }> => {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
    // NOTE: the upload endpoint returns { message, url } directly (no data envelope)
    const res = await apiCall<{ message: string; url: string }>("/uploads", { method: "POST", body: JSON.stringify({ dataUrl }) });
    return { url: res.url };
  },
};

// Review API
export const reviewAPI = {
  createReview: (payload: ApiPayload) => apiCall<ApiEnvelope<Review>>("/reviews", { method: "POST", body: JSON.stringify(payload) }),
  getReviews: (params: ApiParams = {}) => apiCall<ApiList<Review>>(`/reviews?${buildQuery(params)}`),
  getFeaturedReviews: (params: ApiParams = {}) => apiCall<ApiList<FeaturedReview>>(`/reviews/featured?${buildQuery(params)}`),
  updateReview: (id: string, payload: ApiPayload) =>
    apiCall<ApiEnvelope<Review>>(`/reviews/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteReview: (id: string) => apiCall<{ message: string }>(`/reviews/${id}`, { method: "DELETE" }),
};

// Analytics API — dashboards read loose key/value shapes
export const analyticsAPI = {
  getAdminDashboard: () => apiCall<ApiEnvelope<Record<string, any>>>("/analytics/dashboard"),
  getRestaurantAnalytics: (restaurantId: string) => apiCall<ApiEnvelope<Record<string, any>>>(`/analytics/restaurant/${restaurantId}`),
  getOrderAnalytics: () => apiCall<ApiEnvelope<Record<string, any>>>("/analytics/orders"),
  getBookingAnalytics: () => apiCall<ApiEnvelope<Record<string, any>>>("/analytics/bookings"),
};

// Notification API
export const notificationAPI = {
  getNotifications: (params: ApiParams = {}) => apiCall<ApiEnvelope<Notification[]>>(`/notifications?${buildQuery(params)}`),
  markAsRead: (id: string) => apiCall<{ message: string; data?: Notification }>(`/notifications/${id}/read`, { method: "PATCH" }),
  markAllAsRead: () => apiCall<{ message: string }>("/notifications/read-all", { method: "PATCH" }),
  deleteNotification: (id: string) => apiCall<{ message: string }>(`/notifications/${id}`, { method: "DELETE" }),
};
<<<<<<< HEAD

// Delivery API — delivery partner self-service + admin delivery management
export const deliveryAPI = {
  // Registration (public) — partner accounts start pending admin approval
  register: (payload: ApiPayload) =>
    apiCall<AuthResponse>("/delivery/register", { method: "POST", body: JSON.stringify(payload) }),

  // ---------- partner ----------
  getMyProfile: () => apiCall<ApiEnvelope<Record<string, any>>>("/delivery/me"),
  updatePartnerProfile: (payload: ApiPayload) =>
    apiCall<ApiEnvelope<DeliveryPartnerProfile>>("/delivery/profile", { method: "PUT", body: JSON.stringify(payload) }),
  setAvailability: (isAvailable: boolean) =>
    apiCall<{ message: string; data: { status: string; isAvailable: boolean } }>("/delivery/availability", {
      method: "POST",
      body: JSON.stringify({ isAvailable }),
    }),
  updateLocation: (lat: number, lng: number) =>
    apiCall<{ message: string }>("/delivery/location", { method: "PATCH", body: JSON.stringify({ lat, lng }) }),
  getRequests: () => apiCall<ApiList<Order>>("/delivery/requests"),
  getActiveDeliveries: () => apiCall<ApiList<Order>>("/delivery/active"),
  getHistory: (params: ApiParams = {}) => apiCall<ApiList<Order>>(`/delivery/history?${buildQuery(params)}`),
  acceptRequest: (orderId: string) =>
    apiCall<ApiEnvelope<Order>>(`/delivery/orders/${orderId}/accept`, { method: "PATCH" }),
  rejectRequest: (orderId: string, payload: ApiPayload = {}) =>
    apiCall<ApiEnvelope<Order>>(`/delivery/orders/${orderId}/reject`, { method: "PATCH", body: JSON.stringify(payload) }),
  markReached: (orderId: string) =>
    apiCall<ApiEnvelope<Order>>(`/delivery/orders/${orderId}/reached`, { method: "PATCH" }),
  markPickedUp: (orderId: string) =>
    apiCall<ApiEnvelope<Order>>(`/delivery/orders/${orderId}/picked-up`, { method: "PATCH" }),
  startDelivery: (orderId: string) =>
    apiCall<ApiEnvelope<Order>>(`/delivery/orders/${orderId}/start-delivery`, { method: "PATCH" }),
  markDelivered: (orderId: string) =>
    apiCall<{ message: string; data: Order; earning: DeliveryEarningRecord }>(`/delivery/orders/${orderId}/delivered`, {
      method: "PATCH",
    }),
  getMyEarnings: (params: ApiParams = {}) => apiCall<ApiEnvelope<Record<string, any>>>(`/delivery/earnings?${buildQuery(params)}`),
  getWallet: () => apiCall<ApiEnvelope<WalletData>>("/delivery/wallet"),
  getMyPayouts: () => apiCall<ApiList<PayoutRecord>>("/delivery/earnings/payouts"),

  // ---------- admin ----------
  getOverview: () => apiCall<ApiEnvelope<DeliveryOverviewStats>>("/delivery/admin/overview"),
  getPartners: (params: ApiParams = {}) => apiCall<ApiList<DeliveryPartnerProfile>>(`/delivery/admin/partners?${buildQuery(params)}`),
  getPartnerDetail: (id: string) => apiCall<ApiEnvelope<Record<string, any>>>(`/delivery/admin/partners/${id}`),
  approvePartner: (id: string) =>
    apiCall<ApiEnvelope<DeliveryPartnerProfile>>(`/delivery/admin/partners/${id}/approve`, { method: "PATCH" }),
  rejectPartner: (id: string, payload: ApiPayload) =>
    apiCall<ApiEnvelope<DeliveryPartnerProfile>>(`/delivery/admin/partners/${id}/reject`, { method: "PATCH", body: JSON.stringify(payload) }),
  suspendPartner: (id: string, payload: ApiPayload = {}) =>
    apiCall<ApiEnvelope<DeliveryPartnerProfile>>(`/delivery/admin/partners/${id}/suspend`, { method: "PATCH", body: JSON.stringify(payload) }),
  activatePartner: (id: string) =>
    apiCall<ApiEnvelope<DeliveryPartnerProfile>>(`/delivery/admin/partners/${id}/activate`, { method: "PATCH" }),
  getAvailablePartners: (orderId: string) =>
    apiCall<ApiEnvelope<{ order: Order; partners: AvailablePartner[] }>>(`/delivery/admin/available-partners?orderId=${orderId}`),
  assignDelivery: (orderId: string, partnerId: string) =>
    apiCall<ApiEnvelope<Order>>("/delivery/admin/assign", { method: "POST", body: JSON.stringify({ orderId, partnerId }) }),
  getUnassignedOrders: () => apiCall<ApiList<Order>>("/delivery/admin/orders/unassigned"),
  getAdminActiveDeliveries: () => apiCall<ApiList<Order>>("/delivery/admin/orders/active"),
  getCompletedDeliveries: (params: ApiParams = {}) =>
    apiCall<ApiList<Order>>(`/delivery/admin/orders/completed?${buildQuery(params)}`),
  getEarnings: (params: ApiParams = {}) => apiCall<ApiEnvelope<Record<string, any>>>(`/delivery/admin/earnings?${buildQuery(params)}`),
  getPayouts: (params: ApiParams = {}) => apiCall<ApiEnvelope<Record<string, any>>>(`/delivery/admin/payouts?${buildQuery(params)}`),
  createPayout: (payload: ApiPayload) =>
    apiCall<ApiEnvelope<PayoutRecord>>("/delivery/admin/payouts", { method: "POST", body: JSON.stringify(payload) }),
  getSettings: () => apiCall<ApiEnvelope<DeliverySettingsData>>("/delivery/admin/settings"),
  getPartner: (id: string) => apiCall<ApiEnvelope<Record<string, any>>>(`/delivery/admin/partners/${id}`),
  markPayoutPaid: (id: string) => apiCall<ApiEnvelope<PayoutRecord>>(`/delivery/admin/payouts/${id}/mark-paid`, { method: "PATCH" }),
  updateSettings: (payload: ApiPayload) =>
    apiCall<ApiEnvelope<DeliverySettingsData>>("/delivery/admin/settings", { method: "PUT", body: JSON.stringify(payload) }),
};
=======
>>>>>>> 1ed4806eca017c48e5ffc19d534dbae1fea1c856
