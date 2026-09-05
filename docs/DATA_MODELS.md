# Data Models

All 11 Mongoose schemas live in `backend/src/models/`. Every schema uses `{ timestamps: true }` (adds `createdAt` / `updatedAt`).

## User (`User.js`)
| Field | Type | Notes |
|---|---|---|
| `name` | String, required | |
| `email` | String, unique, required | lowercased |
| `password` | String, required | bcrypt hash (12 rounds), never returned |
| `role` | `customer` \| `owner` \| `admin` | default `customer` |
| `phone` | String | unique sparse index |
| `avatar`, `address`, `city` | String | |
| `addresses[]` | `{ label, line (required), city, zip, phone, isDefault }` | saved delivery addresses |
| `isActive` | Boolean | admin suspension flag |
| `otpCode` | String | **bcrypt hash** of the current OTP, never returned |
| `otpExpiresAt` | Date | OTP TTL (10 min) |
| `otpAttempts` | Number | failed verifications for the current code (max 5) |

## Restaurant (`Restaurant.js`)
| Field | Type | Notes |
|---|---|---|
| `owner` | ObjectId → User, required | |
| `name` | String, required | text-indexed for search |
| `description` | String | |
| `cuisine` | String[] | text-indexed |
| `location`, `city`, `latitude`, `longitude` | | text index on `city` |
| `status` | `pending` \| `approved` \| `rejected` | default `pending` |
| `rejectionReason` | String | |
| `rating` / `reviewCount` | Number | 0–5, default 0 |
| `openingTime` / `closingTime` | String | `HH:MM` |
| `isOpen`, `verified`, `isActive` | Boolean | `isActive: false` = suspended by admin |
| `deliveryTime`, `minOrderValue`, `deliveryCharge` | Number | |
| `photos[]`, `banner` | String[] / String | URLs under `/uploads/...` |
| `documents` | `{ licenseNumber, licenseExpiry, gstin }` | |
| `suspendedReason` | String | |

Indexes: text (`name`, `cuisine`, `city`), `{ city: 1, status: 1 }`.

## MenuItem (`MenuItem.js`)
| Field | Type | Notes |
|---|---|---|
| `restaurant` | ObjectId → Restaurant, required | |
| `name`, `category` | String, required | |
| `price` | Number, required | server re-prices orders from this |
| `originalPrice` | Number | for discount display |
| `image` | String | |
| `isVeg`, `isSpicy`, `isAvailable` | Boolean | |
| `preparationTime` | Number (minutes) | |
| `rating` / `reviewCount` | Number | |

Index: `{ restaurant: 1, category: 1 }`.

## Order (`Order.js`)
| Field | Type | Notes |
|---|---|---|
| `orderNumber` | String | `ORD-...` |
| `customer` / `restaurant` | ObjectId, required | |
| `items[]` | `{ menuItem → MenuItem, quantity, price, specialInstructions }` | price snapshotted at order time |
| `subtotal`, `deliveryCharge`, `tax`, `total` | Number | all server-calculated (5% tax) |
| `paymentMethod` | `card` \| `wallet` \| `cash` \| `upi` | |
| `paymentStatus` | `pending` \| `completed` \| `failed` | |
| `type` | `delivery` \| `dine-in` | |
| `table` → Table, `booking` → Booking | ObjectId | dine-in only |
| `deliveryAddress` | `{ street, city, state, zip, latitude, longitude }` | |
| `status` | `placed` \| `confirmed` \| `preparing` \| `ready` \| `out_for_delivery` \| `delivered` \| `served` \| `cancelled` | `served` = dine-in terminal state |
| `statusUpdates[]` | `{ status, timestamp, note }` | full transition history |
| `rating`, `review`, `cancelReason` | | |

Indexes: `{ customer: 1, createdAt: -1 }`, `{ restaurant: 1, status: 1 }`, `{ restaurant: 1, type: 1, createdAt: -1 }`.

## Booking (`Booking.js`)
| Field | Type | Notes |
|---|---|---|
| `bookingNumber` | String | |
| `bookingCode` | String, unique sparse | short code embedded in the booking QR |
| `customer` / `restaurant` / `slot` → TableSlot | required | |
| `table` → Table | optional | assigned table |
| `partySize` | Number, required | capacity-checked against the slot |
| `status` | `confirmed` \| `cancelled` \| `completed` \| `no-show` | |
| `guestName`, `guestPhone`, `guestEmail` | | for guest bookings |
| `cancellationReason`, `cancellationTime` | | |
| `reminder`, `reminderSent` | Boolean | |
| `advanceAmount` | Number | server-computed advance: ₹200 base (2 guests) + ₹50 per extra guest |
| `advancePaymentMethod` | `card` \| `upi` \| `wallet` | how the advance was paid |
| `advanceStatus` | `paid` \| `refunded` | set to `refunded` on cancellation |
| `refundAmount` | Number | 50% of `advanceAmount`, set on cancellation |

Indexes: `{ customer: 1, status: 1 }`, `{ restaurant: 1, createdAt: -1 }`.

## Table (`Table.js`)
| Field | Type | Notes |
|---|---|---|
| `restaurant` | ObjectId → Restaurant, required | |
| `name` | String, required | e.g. `T1`, `Terrace 2` |
| `capacity` | Number, min 1 | |
| `status` | `free` \| `occupied` \| `reserved` \| `inactive` | |
| `qrCode` | String, unique, required | payload scanned at the table |
| `isActive` | Boolean | |

Index: `{ restaurant: 1, name: 1 }` unique.

## TableSlot (`TableSlot.js`)
| Field | Type | Notes |
|---|---|---|
| `restaurant` | ObjectId → Restaurant, required | |
| `table` → Table | optional | |
| `date` | Date, required | |
| `startTime` / `endTime` | String (`HH:MM`) | |
| `capacity` / `booked` | Number | booking decrements availability |
| `price`, `description` | | |
| `isActive` | Boolean | |

Indexes: `{ restaurant: 1, date: 1 }`, `{ date: 1, isActive: 1 }`.

## Review (`Review.js`)
`customer` (required), `restaurant`, `order`, `menuItem`, `type` (`restaurant` | `food` | `delivery`, required), `rating` (1–5, required), `comment`, `photos[]`, `likes`, `helpful`.
Indexes: `{ restaurant: 1, createdAt: -1 }`, `{ menuItem: 1, createdAt: -1 }`.

## Notification (`Notification.js`)
`user` (required), `type` (`order` | `booking` | `restaurant` | `promo` | `system`, required), `title`, `message`, `data` (Mixed), `read`, `readAt`, `relatedId`.
Indexes: `{ user: 1, createdAt: -1 }`, `{ user: 1, read: 1 }`.

## Report (`Report.js`)
`customer` (required), `restaurant`, `order`, `category` (`order` | `food-quality` | `delivery` | `booking` | `staff` | `other`), `subject` (required), `description` (required), `status` (`open` | `reviewing` | `resolved` | `dismissed`), `adminNotes`.
Indexes: `{ status: 1, createdAt: -1 }`, `{ customer: 1, createdAt: -1 }`.

## Analytics (`Analytics.js`)
`date`, `restaurant`, `ordersCount`, `bookingsCount`, `revenue`, `cancelledOrders`, `totalCustomers`, `averageOrderValue`, `topMenuItems[]` (`{ menuItem, count, revenue }`).
Index: `{ restaurant: 1, date: -1 }`.
