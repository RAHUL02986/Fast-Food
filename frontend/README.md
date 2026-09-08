# Quick Food — Frontend

Next.js 14 (App Router) web client for the Quick Food platform.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. (Optional) Point the client at a different API by creating `.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:4000/api
   ```
   Defaults to `http://localhost:4000/api`.
3. Start the dev server (API must be running on port 4000 — see `../backend/README.md`):
   ```bash
   npm run dev       # http://localhost:3000
   npm run build     # production build
   npm start         # serve production build
   ```

## Page Map (App Router)

| Route                        | Role     | Description                                          |
|------------------------------|----------|------------------------------------------------------|
| `/`                          | Public   | Landing page: hero, search, featured restaurants     |
| `/login`                     | Public   | Sign in via **password or OTP** (redirects by role)  |
| `/signup`                    | Public   | Create account (customer or owner)                   |
| `/dashboard`                 | Customer | My orders & bookings overview                        |
| `/restaurants`               | Public   | Browse + filter (cuisine, rating, sort)              |
| `/restaurant/[id]`           | Public   | Restaurant detail + menu + add to cart               |
| `/checkout`                  | Customer | Delivery or dine-in checkout (address + payment)     |
| `/orders`                    | Customer | Order history (delivery & dine-in)                   |
| `/orders/[id]`               | Customer | Order detail & live status tracking                  |
| `/bookings`                  | Customer | My table bookings                                    |
| `/bookings/[id]`             | Customer | Booking confirmation **with QR**, reschedule, cancel |
| `/bookings/book`             | Customer | Booking flow (date → slot → party size)              |
| `/table/[code]`              | Public   | **Table QR landing** → dine-in menu + live status    |
| `/profile`                   | Any      | Profile + **saved addresses** management             |
| `/admin`                     | Admin    | Admin dashboard (totals & revenue)                   |
| `/admin/restaurants`         | Admin    | Approve/reject + **suspend/activate** restaurants    |
| `/admin/orders`              | Admin    | All orders (read-only — no owner actions)            |
| `/admin/bookings`            | Admin    | All bookings (read-only)                             |
| `/admin/customers`           | Admin    | Customer list + **suspend/reactivate**               |
| `/admin/reports`             | Admin    | Complaints/reports (view + status)                   |
| `/admin/analytics`           | Admin    | Order & booking analytics                            |
| `/owner`                     | Owner    | Workspace overview (static demo layout)              |
| `/owner/dashboard`           | Owner    | Live restaurant dashboard                            |
| `/owner/dashboard-v2`        | Owner    | Alternate dashboard layout                           |
| `/owner/orders`              | Owner    | **Live order queue** (accept/reject/status, summary) |
| `/owner/menu`                | Owner    | Menu CRUD + availability toggle                      |
| `/owner/coupons`             | Owner    | **Coupon management** — assign discounts to entire menu or specific/multiple products |
| `/owner/tables`              | Owner    | **Tables (QR) & booking slots management**           |
| `/owner/bookings`            | Owner    | Incoming reservations & status updates               |
| `/owner/analytics`           | Owner    | Restaurant revenue / top items                       |
| `/owner/register-restaurant` | Owner    | Restaurant registration form (→ pending approval)    |

## Architecture Notes

- **Auth layer** — `lib/AuthContext.tsx` provides a client-side `AuthProvider` + `useAuth()` hook:
  - On mount, reads the JWT from `localStorage("token")` and validates it via `GET /auth/profile`.
  - Exposes `user`, `loading`, `login`, `loginWithOtp`, `requestOtp`, `signup`, `logout`, `updateProfile`.
  - After login, users are redirected by role: admin → `/admin`, owner → `/owner/dashboard`, customer → `/dashboard`.
  - Pages guard themselves (e.g., `/dashboard` redirects non-customers to `/login`).
- **API layer** — `lib/api.ts`:
  - `apiCall(endpoint, options)` wraps `fetch` with `Content-Type: application/json` and the stored `Bearer` token; throws `Error(data.message)` on non-OK responses.
  - Per-resource helpers: `authAPI`, `restaurantAPI`, `menuAPI`, `orderAPI`, `bookingAPI`, `tableAPI`, `slotAPI`, `adminAPI`, `reportAPI`, `reviewAPI`, `analyticsAPI`, `notificationAPI`.
- **Dine-in flow** — scanning a table QR code (`/table/<code>`) opens that table's menu; orders are posted with `type: "dine-in"` + `table`, and the page polls `GET /tables/:id/orders` every 8s for live Received → Preparing → Served status.
- **Styling** — Tailwind CSS 3 (`tailwind.config.ts` scans `app/` and `components/`) plus a custom design system in `app/globals.css` (`.shell`, `.nav`, `.restaurant-card`, dashboard panels, login layout).
- **Icons** — [lucide-react](https://lucide.dev) throughout.
- **Shared chrome** — `components/Navs.tsx` exports `AdminNav` / `OwnerNav` used by the role dashboards.

## Conventions

- Pages are mostly **client components** (`"use client"`) that fetch data in `useEffect`.
- Path alias `@/*` maps to the project root (`@/lib/api`, `@/lib/AuthContext`).
- TypeScript is strict; API responses are loosely typed (`any` in places) — refine as the app matures.
- Keep new shared UI in a `components/` folder and register it in `tailwind.config.ts` content globs.
