# Caspian Tandoori — PRD

## Original problem statement (2026-01)
1. Customers cannot place an order before the shop opens — and outside opening hours, the timing should be displayed on the website.
2. Include delivery charges: Kelty £3.00, Cowdenbeath £3.50, and the rest (Kinross, Lochgelly, Ballingry, Cardenden) £6.50 — auto-detected so the owner doesn't pay from their own pocket.
3. Admin should get a notification / ringtone when a new order arrives.
4. Customer should see how long the order takes and the live status as the owner updates it.

## Tech stack
- React + Vite (client) — `/app/client`
- Node.js + Express + Mongoose (server) — `/app/server`
- MongoDB
- Stripe Checkout (embedded)

## Implemented in this iteration
- **Shop opening hours** (structured per-day open/close + closed flag) with new public endpoint `GET /api/settings/shop-status`.
  - Default hours: Mon–Thu, Sun 16:00 – 00:00; Fri–Sat 16:00 – 01:00 (next day).
  - Server-side validation in `/api/payments/create-checkout-session` blocks ASAP orders when closed and requires a valid scheduled time.
  - Header banner shows open/closed status + next opening time.
- **Pre-orders / scheduling** — customers can choose "ASAP" (only when open) or "Schedule for later"; CartDrawer auto-forces scheduling when closed.
- **Delivery zones & auto-detection** — new `deliveryZones` array on `RestaurantSettings` (admin editable) + public endpoint `POST /api/settings/delivery-quote` returning area + fee.
  - Defaults: Kelty £3.00 (`kelty`, `ky4 0`), Cowdenbeath £3.50 (`cowdenbeath`, `ky4 9`), Kinross £6.50 (`kinross`, `ky13`), Lochgelly £6.50 (`lochgelly`, `ky5 9`), Ballingry £6.50 (`ballingry`, `ky5 8`), Cardenden £6.50 (`cardenden`, `ky5 0`).
  - Cart shows live subtotal + delivery fee + grand total; non-deliverable addresses block submission.
  - Stripe line items now include the delivery fee separately so the owner is reimbursed.
- **Admin ringtone on new orders** — `AdminOrders` polls every 15 s and plays a WebAudio chime + browser notification on new Pending orders. Sound toggle persisted in `localStorage` (`caspian_admin_sound`).
- **Status tracking for customers** — `OrderStatusTracker` step bar in Order History (Pending → Accepted → Preparing → Ready/Out for delivery → Completed/Delivered) with live ETA. Profile page polls every 20 s.
- **Admin ETA management** — auto-ETA (Collection 30 min, Delivery 45 min) set on first "Accepted"; admin can override via 15/30/45/60/90 min buttons. New endpoint `PATCH /api/admin/orders/:id/estimate`.
- **AdminSettings UI** — restructured opening hours editor (per-day time pickers + closed checkbox) and per-zone fee editor with keyword targeting.
- **Migration** — `getOrCreateSettings()` in `server.js` auto-converts legacy string-based opening hours + delivery zones to the new schema.

## Files changed
- `server/src/models/RestaurantSettings.js` — structured hours + deliveryZones[] + ETA defaults.
- `server/src/models/Order.js` — `subtotal`, `deliveryFee`, `deliveryArea`, `scheduledFor`, `estimatedMinutes`, `estimatedReadyAt`.
- `server/src/utils/shop.js` — new helpers `getShopStatus`, `quoteDelivery`, `isScheduledTimeValid`.
- `server/src/server.js` — public endpoints `/api/settings/shop-status`, `/api/settings/delivery-quote` + legacy migration.
- `server/src/routes/payment.routes.js` — server-side delivery fee + schedule validation.
- `server/src/routes/admin.routes.js` — auto-set ETA on Accepted + `PATCH /:id/estimate`.
- `client/src/api.js` — `settingsApi.shopStatus`, `settingsApi.deliveryQuote`, `adminApi.setEstimatedTime`.
- `client/src/App.jsx` — header status bar, polling, CartDrawer rewrite, OrderStatusTracker, profile polling.
- `client/src/components/admin/AdminOrders.jsx` — ringtone + ETA UI.
- `client/src/components/admin/AdminSettings.jsx` — structured hours + delivery zones editor.

## Verified
- `/api/settings/shop-status` → returns correct open/closed + next opening time.
- `/api/settings/delivery-quote` → Kelty £3.00, Cowdenbeath £3.50, Kinross £6.50, random address rejected.
- Checkout session refuses ASAP orders when closed.
- Below-minimum delivery (< £12) rejected.
- `PATCH /admin/orders/:id/status` auto-sets ETA on first Accept.
- `PATCH /admin/orders/:id/estimate` updates `estimatedReadyAt`.
- All client + server files lint clean (`node --check`, ESLint).

## Backlog / P1
- Add an audible ringtone file fallback for browsers without WebAudio (current chime is synthesised).
- Schedule guardrails: enforce server-side that scheduled time is at most 7 days ahead.
- Email/SMS notifications on status change (currently in-app only).
- Add geocoding-based postcode lookup (Postcodes.io) for tighter zone matching.

## Future
- Loyalty points integration with order completion.
- Driver/runner role with order routing.
- Day-ahead production planning report.

_Last updated: 2026-01_
