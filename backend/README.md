# Quick Food — Backend

Express REST API for the Quick Food food-delivery & table-booking platform.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create `.env` (see `.env.example`):
   ```env
   PORT=4000
   MONGODB_URI=mongodb://127.0.0.1:27017/quick-food
   JWT_SECRET=replace-with-a-long-local-secret
   CLIENT_URL=http://localhost:3000
   ```
3. Ensure MongoDB is running, then start:
   ```bash
   npm run dev     # watch mode
   npm start       # production
   ```
4. Optional — seed demo data (⚠️ wipes users, restaurants, menu items, and table slots):
   ```bash
   node src/seed.js
   ```

## Scripts

| Script           | Description                                  |
|------------------|----------------------------------------------|
| `npm run dev`    | `node --watch src/server.js` (auto-restart)  |
| `npm start`      | `node src/server.js`                         |
| `node src/seed.js` | Reset & seed demo data (see printed credentials) |

## Environment Variables

| Variable      | Required | Default                                  | Purpose                        |
|---------------|----------|------------------------------------------|--------------------------------|
| `PORT`        | No       | `4000`                                   | HTTP port                      |
| `MONGODB_URI` | No       | `mongodb://127.0.0.1:27017/quick-food`   | MongoDB connection string      |
| `JWT_SECRET`  | **Yes**  | —                                        | Signing secret for JWT tokens  |
| `CLIENT_URL`  | No       | `http://localhost:3000`                  | Allowed CORS origin            |

## Folder Guide

```
src/
├── server.js               # Boot: dotenv, CORS (CLIENT_URL), JSON body parsing,
│                           # /health, route mounting, 404, central errorHandler
├── seed.js                 # Dev seeder: admin/owner/customer users,
│                           # "The Green Fork" restaurant, 4 menu items,
│                           # table slots for the next 7 days
├── routes/                 # One file per resource; wires endpoints to
│                           # controllers with Zod validation + auth guards
├── controllers/            # Business logic (auth, restaurants, menu, orders,
│                           # bookings, reviews, analytics)
├── models/                 # Mongoose schemas (User, Restaurant, MenuItem,
│                           # Order, Booking, TableSlot, Review, Notification,
│                           # Analytics)
├── middleware/
│   ├── auth.js             # authenticate (JWT → req.user), authorize([roles])
│   ├── validation.js       # validateRequest / validateQuery (Zod)
│   └── errorHandler.js     # Central error mapper + asyncHandler helper
└── utils/
    └── notificationService.js  # createNotification / getNotifications / markAsRead
```

## API Surface (mounted in `server.js`)

| Base path                                  | Router               |
|--------------------------------------------|----------------------|
| `GET /health`                              | health check         |
| `/api/auth`                                | auth (password, OTP) |
| `/api/restaurants`                         | restaurantRoutes     |
| `/api/restaurants/:restaurantId/menu`      | menuRoutes (merged params) |
| `/api/orders`                              | orderRoutes (incl. `daily-summary`) |
| `/api/bookings`                            | bookingRoutes (incl. `:id/reschedule`) |
| `/api/tables`                              | tableRoutes (owner CRUD + public `/qr/:code`) |
| `/api/slots`                               | slotRoutes (owner slot management) |
| `/api/admin`                               | adminRoutes (customers, bookings, reports, moderation) |
| `/api/reviews`                             | reviewRoutes         |
| `/api/analytics`                           | analyticsRoutes      |
| `/api/notifications`                       | notificationRoutes   |

Full endpoint reference: [../docs/API.md](../docs/API.md).

## Conventions

- **ES Modules** (`"type": "module"`) — use `import/export` and `.js` extensions in specifiers.
- Controllers wrap logic in `try/catch` and forward errors via `next(error)` to the central handler:
  - Mongoose `ValidationError` → `400` with per-field messages
  - Duplicate key (`code 11000`) → `409` `<field> already exists`
  - `error.status` / `error.statusCode` → respected, otherwise `500`
- Passwords hashed with bcrypt (12 rounds) in a `pre("save")` hook; `toJSON` strips the password field.
- Money/pricing is computed **server-side** (orders) — never trust client totals.
