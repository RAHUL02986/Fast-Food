# Quick Food 🍽️

A full-stack **food delivery and restaurant table booking platform**. Customers browse restaurants, order food, and book tables. Restaurant owners manage menus, orders, and reservations. Admins approve restaurants and monitor platform-wide analytics.

## Features

### 🙋 Customer
- Browse & search approved restaurants (filter by cuisine/location/rating, sort by rating)
- View menus with categories, veg/non-veg tags, prices, and ratings
- Place delivery orders — server-calculated subtotal + delivery charge + 5% tax, with live status tracking
- Checkout with **saved addresses** and payment method (card / UPI / wallet / cash)
- Book tables via capacity-managed time slots with **advance payment** (₹200 for 2 guests + ₹50 per extra guest, 50% refundable on cancellation); **QR confirmation**, reschedule or cancel
- **Dine-in**: scan a table QR (`/table/<code>`) → order from the table → live status (Received → Preparing → Served)
- Rate & review restaurants and food items, file complaints/reports
- In-app notifications for order/booking/restaurant events
- **OTP login** (email or phone) and profile management with saved addresses

### 🏪 Restaurant Owner
- Register a restaurant (enters `pending` state until admin approval)
- Full menu CRUD with availability toggle
- **Live order queue** (delivery + dine-in): accept/reject, update status, daily summary
- **Table management**: create tables with QR codes, mark occupied/free
- **Slot management**: create/delete booking time slots, booking status handling
- Restaurant analytics: revenue, monthly orders, top menu items

### 🛡️ Admin (strictly read / moderate)
- Approve / reject restaurant registrations; **suspend/activate** restaurants & customers
- Read-only oversight of all restaurants, orders, bookings, customers
- Handle complaints/reports (view + status update only — never owner menu/order data)
- Platform analytics: totals, revenue, order & booking status breakdown

## Tech Stack

| Layer      | Technology                                              |
|------------|---------------------------------------------------------|
| Backend    | Node.js (ESM), Express 4, Mongoose 8 (MongoDB)          |
| Auth       | JWT (7-day expiry) + bcryptjs password hashing          |
| Validation | Zod request schemas                                     |
| Frontend   | Next.js 14 (App Router), React 18, TypeScript           |
| Styling    | Tailwind CSS 3 + custom design system in `globals.css`  |
| Icons      | lucide-react                                            |

## Project Structure

```
Quick-food/
├── backend/                 # Express REST API (port 4000)
│   └── src/
│       ├── server.js        # App bootstrap, CORS, route mounting
│       ├── seed.js          # Dev database seeder (npm run seed docs below)
│       ├── routes/          # Endpoint wiring + Zod validation + role guards
│       ├── controllers/     # Business logic
│       ├── models/          # 9 Mongoose schemas
│       ├── middleware/      # auth (JWT/roles), validation, errorHandler
│       └── utils/           # notificationService
├── frontend/                # Next.js web app (port 3000)
│   ├── app/                 # App Router pages (customer/owner/admin)
│   └── lib/                 # api.ts (typed fetch) + AuthContext.tsx
└── docs/                    # Detailed documentation
```

## Quick Start

**Prerequisites:** Node.js 18+, MongoDB running locally (default `mongodb://127.0.0.1:27017/quick-food`).

1. **Install dependencies** — one command from the repo root (installs root tooling + backend + frontend):
   ```bash
   npm run setup
   ```
   or manually:
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```
2. **Configure environment** — copy `backend/.env.example` to `backend/.env` and adjust if needed:
   ```env
   PORT=4000
   MONGODB_URI=mongodb://127.0.0.1:27017/quick-food
   JWT_SECRET=replace-with-a-long-local-secret
   CLIENT_URL=http://localhost:3000
   ```
3. **Seed the database** (creates test users, a demo restaurant, menu items, and 7 days of table slots — *wipes existing data*):
   ```bash
   npm run seed        # from the repo root, or: cd backend && node src/seed.js
   ```
4. **Run both apps** — one command from the repo root (after `npm run setup`):
   ```bash
   npm run dev         # API on :4000 + web app on :3000, single terminal
   ```
   Or in separate terminals:
   ```bash
   # Terminal 1 — API on http://localhost:4000
   cd backend && npm run dev

   # Terminal 2 — Web app on http://localhost:3000
   cd frontend && npm run dev
   ```

## Test Accounts (after seeding)

| Role     | Email                    | Password        | Notes                        |
|----------|--------------------------|-----------------|------------------------------|
| Admin    | admin@quickfood.com      | admin123456     | Platform moderation          |
| Owner    | owner@quickfood.com      | owner123456     | Owns "The Green Fork"        |
| Owner 2  | owner2@quickfood.com     | owner123456     | Owns "Miso & More"           |
| Customer | customer@quickfood.com   | customer123456  | Phone `9988776655` for OTP   |

Table QR codes are printed by the seeder — visit `http://localhost:3000/table/<code>` to test the dine-in flow.

## Documentation

| Doc                                          | Contents                                              |
|----------------------------------------------|-------------------------------------------------------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, request lifecycle, domain workflows    |
| [docs/API.md](docs/API.md)                   | Full REST API reference with examples                 |
| [docs/DATA_MODELS.md](docs/DATA_MODELS.md)   | All Mongoose schemas, fields, enums, and indexes      |
| [backend/README.md](backend/README.md)       | Backend setup, scripts, env vars, folder guide        |
| [frontend/README.md](frontend/README.md)     | Frontend setup, page map, API/auth layer, conventions |

## Scripts

| Location  | Command         | Description                     |
|-----------|-----------------|---------------------------------|
| `backend` | `npm run dev`   | Start API with watch mode       |
| `backend` | `npm start`     | Start API (production mode)     |
| `frontend`| `npm run dev`   | Start Next.js dev server        |
| `frontend`| `npm run build` | Production build                |
| `frontend`| `npm start`     | Serve production build          |

