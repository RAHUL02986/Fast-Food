# API Reference

Base URL: `http://localhost:4000/api` (configurable via `NEXT_PUBLIC_API_URL` on the frontend, `PORT` on the backend).

- **Auth**: `Authorization: Bearer <token>` header (JWT, 7-day expiry). Roles: `customer`, `owner`, `admin`.
- **Envelopes**: list endpoints return `{ success, count, total?, unreadCount?, data: [...] }`. Single-resource endpoints return `{ message, data: {...} }` unless marked **raw**.
- **Errors**: `{ message, errors? }` with proper status codes (400 validation, 401 auth, 403 role, 404 missing, 409 duplicate, 429 rate-limited).

## Health

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | — | `{ status: "ok" }` |

## Auth (`/auth`) — rate-limited

| Method | Path | Auth | Body / Notes |
|---|---|---|---|
| POST | `/signup` | — | `{ name, email, password (8+), role?, phone? }` → `{ token, user }` |
| POST | `/login` | — | `{ email (email or phone), password }` → `{ token, user }` |
| POST | `/otp/request` | — | `{ identifier }` → `{ message }` + `otp` **only in dev** (5 req / 15 min / IP) |
| POST | `/otp/verify` | — | `{ identifier, otp (6 digits) }` → `{ token, user }` (max 5 wrong attempts per code) |
| GET | `/verify` | any | **raw** `{ valid, user }` |
| GET | `/profile` | any | **raw** user object |
| PUT | `/profile` | any | `{ name?, phone?, address?, city?, avatar?, addresses? }` |
| POST | `/change-password` | any | `{ currentPassword, newPassword }` |

```bash
# password login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"customer@quickfood.com","password":"customer123456"}'
```

## Restaurants (`/restaurants`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | — | Browse. Query: `search` (text index), `city`, plus others |
| GET | `/:id` | — | Single restaurant |
| POST | `/` | owner | Register restaurant (starts `pending`) |
| PUT | `/:id` | owner | Update own restaurant |
| GET | `/owner/my-restaurant` | owner | Owner's own restaurant |
| GET | `/pending/list` | admin | Pending registrations |
| PATCH | `/:id/approve` | admin | Approve registration |
| PATCH | `/:id/reject` | admin | Reject — body `{ reason }` |
| GET | `/admin/all` | admin | All restaurants incl. suspended |

## Menu (`/restaurants/:restaurantId/menu`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | — | Menu items. Query: `category`, `search`, `available` |
| GET | `/:id` | — | Single item |
| GET | `/restaurant/:restaurantId/categories` | — | Distinct categories |
| POST | `/` | owner | Create item |
| PUT | `/:id` | owner | Update item |
| DELETE | `/:id` | owner | Delete item |
| PATCH | `/:id/availability` | owner | Toggle availability |

## Coupons (`/restaurants/:restaurantId/coupons`)

Owner-created coupons, assignable to the **entire menu or one/multiple specific products**.

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | — / owner | Live coupons (active, in-date, under usage limit). Owners add `?all=true` for every coupon |
| POST | `/validate` | — | `{ code, items: [{ menuItem, quantity }] }` → discount preview. Re-prices the cart from the DB |
| POST | `/` | owner | `{ code, discountType: "percentage"\|"flat", discountValue, applyToAllItems, applicableItems?, minOrderAmount?, maxDiscount?, validFrom?, validUntil, usageLimit? }` |
| PUT | `/:id` | owner | Same body as POST — full update |
| PATCH | `/:id/status` | owner | `{ isActive }` — activate/deactivate |
| DELETE | `/:id` | owner | Remove the coupon |

Validation at order time: coupon must be active, within its validity window, under its usage limit, and the cart must contain at least one assigned product meeting `minOrderAmount`. The discount applies only to eligible items; percentage discounts respect `maxDiscount`; 5% tax is computed on the discounted amount.

## Orders (`/orders`)

## Orders (`/orders`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/` | customer | `{ items: [{ menuItem, quantity }], restaurant, type, paymentMethod, deliveryAddress?, table?, booking?, couponCode? }` — server re-prices everything and re-validates the coupon |
| GET | `/` | any | Own orders (customers), restaurant orders (owners). Query: `status`, `type`, `restaurantId`, `date`. Populates `restaurant.name`, `customer.name/phone`, `table.name`, `items.menuItem.name` |
| GET | `/daily-summary` | owner | `{ date, ordersToday, revenueToday, deliveryOrders, dineInOrders, activeOrders, bookingsToday, statusBreakdown }` |
| GET | `/:id` | any | Order detail — populates full restaurant, customer, `items.menuItem`, table |
| PATCH | `/:id/status` | owner | `{ status, note? }` — advances the status machine |
| PATCH | `/:id/reject` | owner | `{ reason }` |
| PATCH | `/:id/cancel` | customer | `{ reason }` — only while `placed`/`confirmed` |
| POST | `/:id/rate` | customer | `{ rating, review }` — delivered orders only |

## Bookings (`/bookings`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/` | customer | `{ restaurant, slot, partySize (min 2), advancePaymentMethod? (card/upi/wallet), specialRequests?, guestName?... }` — advance collected at booking: **₹200 for 2 guests + ₹50 per extra guest** (server-computed) |
| GET | `/` | any | Own (customer) / restaurant (owner) bookings |
| GET | `/available-slots` | — | Public slot availability. Query: `restaurantId`, `date` |
| GET | `/:id` | any | Booking detail (QR confirmation data) |
| PATCH | `/:id/cancel` | customer | Cancel booking — refunds 50% of the advance |
| PATCH | `/:id/reschedule` | customer | Move to another slot |
| PATCH | `/:id/status` | owner | `completed` / `no-show` |

## Tables (`/tables`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/qr/:code` | — | **Public** QR entry point → `{ data: { table: {_id, name, capacity, status}, restaurant } }` |
| GET | `/:tableId/orders` | — | **Public** live dine-in orders for a table (`?all=true` for history). Populates `items.menuItem.name` |
| POST | `/` | owner | Create table (generates `qrCode`) |
| GET | `/` | owner | Own tables |
| PATCH | `/:id` | owner | Update table |
| PATCH | `/:id/status` | owner | `free` / `occupied` / `reserved` / `inactive` |
| DELETE | `/:id` | owner | Delete table |

## Slots (`/slots`) — owner only

| Method | Path | Description |
|---|---|---|
| POST | `/` | Create capacity-managed slots for a date range |
| GET | `/` | List own slots (`?date=`) |
| DELETE | `/:id` | Delete slot |

## Admin (`/admin`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/reports` | customer | File a complaint `{ restaurant?, order?, category, subject, description }` |
| GET | `/customers` | admin | List customers (`?search=`, `?status=`) |
| GET | `/bookings` | admin | All bookings |
| PATCH | `/customers/:id/active` | admin | `{ isActive }` suspend/activate customer |
| PATCH | `/restaurants/:id/active` | admin | `{ isActive }` suspend/activate restaurant |
| GET | `/reports` | admin | Complaints queue |
| PATCH | `/reports/:id` | admin | `{ status, adminNotes? }` |

## Reviews (`/reviews`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | — | Query: `restaurantId`, `menuItemId` |
| POST | `/` | customer | `{ type, rating, comment?, restaurant?, menuItem?, order? }` |
| PUT | `/:id` | customer | Update own review |
| DELETE | `/:id` | customer | Delete own review |
| PATCH | `/:id/helpful` | any | Mark review helpful |

## Analytics (`/analytics`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/dashboard` | admin | Platform totals + status breakdowns |
| GET | `/orders` | admin | Order analytics |
| GET | `/bookings` | admin | Booking analytics |
| GET | `/restaurant/:restaurantId` | owner | Own restaurant revenue/top items |

## Notifications (`/notifications`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | any | `{ success, count, total, unreadCount, data }` (`?limit=`, `?skip=`) |
| PATCH | `/:id/read` | any | Mark one read |
| PATCH | `/read-all` | any | Mark all read |
| DELETE | `/:id` | any | Delete one |

## Uploads (`/uploads`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/` | any | `{ dataUrl: "data:image/png;base64,..." }` → **raw** `{ message, url }`. Max 5 MB; jpeg/png/webp/gif. Files served from `/uploads/<file>` |

## Rate limiting

| Scope | Budget |
|---|---|
| All `/api/*` | 1000 requests / 15 min / IP |
| `POST /auth/login` | 10 / 15 min / IP |
| `POST /auth/signup` | 20 / hour / IP |
| `POST /auth/otp/request` | 5 / 15 min / IP |
| `POST /auth/otp/verify` | 10 / 15 min / IP |

Responses include standard `RateLimit-*` headers.

