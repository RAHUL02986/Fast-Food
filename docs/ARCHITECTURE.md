# Architecture

Quick Food is a three-tier full-stack application: a Next.js 14 web app (App Router), an Express 4 REST API, and MongoDB via Mongoose 8.

```
┌─────────────────────┐         ┌──────────────────────────┐        ┌──────────┐
│  Frontend (Next.js)  │  HTTP   │  Backend (Express API)    │  Mongoose  │ MongoDB  │
│  localhost:3000      │ ──────▶ │  localhost:4000           │ ─────────▶ │ :27017   │
│  React 18 + Tailwind │  JSON   │  JWT auth · Zod validation│            │          │
└─────────────────────┘         └──────────────────────────┘        └──────────┘
```

## Layers

| Layer | Location | Responsibility |
|---|---|---|
| Pages | `frontend/app/**` | App Router pages per role (`/owner/*`, `/admin/*`, customer pages at the root) |
| API client | `frontend/lib/api.ts` | Typed `fetch` wrapper: JWT header, envelope parsing, friendly errors, 401 handling |
| Auth state | `frontend/lib/AuthContext.tsx` | `AuthProvider` — token in `localStorage`, profile verification on mount, role helpers |
| Types | `frontend/types/index.ts` | Interfaces mirroring the Mongoose schemas |
| Routes | `backend/src/routes/*.js` | Endpoint wiring: Zod validation, role guards, rate limiters |
| Controllers | `backend/src/controllers/*.js` | Business logic (server-calculated money, status transitions, notifications) |
| Models | `backend/src/models/*.js` | 11 Mongoose schemas with indexes |
| Middleware | `backend/src/middleware/*.js` | `auth` (JWT + roles), `validation` (Zod), `rateLimit`, `errorHandler` |

## Request lifecycle

1. `helmet` security headers → CORS (single origin, `CLIENT_URL`) → global API rate limiter → `express.json`.
2. Route-level middleware in order: **rate limiter** (auth endpoints) → **Zod validation** → **`authenticate`** (JWT → `req.user`, rejects inactive users) → **`authorize([...roles])`**.
3. Controller runs; all async handlers forward errors via `next(error)`.
4. `errorHandler` maps Mongoose `ValidationError` → 400, duplicate key → 409, `error.status` → that status, and hides unexpected 500 details in production.

## Domain workflows

**Delivery order** — customer builds cart → `POST /api/orders` → server re-prices every item from the DB (never trusts client prices), adds 5% tax + delivery charge → status machine `placed → confirmed → preparing → ready → out_for_delivery → delivered` (owner-only transitions) → both parties get in-app notifications.

**Dine-in order** — customer scans table QR (`/table/<code>`) → public `GET /api/tables/qr/:code` resolves the table → order placed with `type: "dine-in"` (no delivery charge) → owner serves it → `served` terminal status. The table page polls `GET /api/tables/:tableId/orders` every 8s for live status.

**Table booking** — owner creates capacity-based `TableSlot`s for 7 days → customer books via `POST /api/bookings` (slot capacity checked) → booking gets a short `bookingCode` embedded in a QR confirmation → reschedule/cancel allowed → owner marks completed / no-show.

**Restaurant lifecycle** — owner registers → `pending` → admin approves (`/approve`) or rejects with reason → suspended restaurants (`isActive: false`) disappear from browse and refuse orders.

**Auth** — password login (bcryptjs, 12 rounds) or OTP login: request → 6-digit code (bcrypt-hashed at rest, 10-min TTL, max 5 verification attempts) → verify → 7-day JWT. OTP endpoints are IP-rate-limited; the plaintext OTP is only returned in the API response when `NODE_ENV !== "production"`.

## Conventions

- Money is always **server-calculated** in `orderController.js` (client values ignored).
- Responses follow an envelope: `{ success, count, total, data }` (a few endpoints return the raw object, documented in `API.md`).
- Frontend pages are client components; all data flows through `lib/api.ts` — no direct `fetch` calls.
