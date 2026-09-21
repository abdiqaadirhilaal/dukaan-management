# Dukaan Management System

React + TypeScript + Tailwind frontend, Node + Express + TypeScript API, MongoDB (Mongoose), JWT auth.

## Setup

```bash
# 1. Backend
cd backend
cp .env.example .env        # set JWT_SECRET to a long random string (32+ chars)
npm install
npm run create-user -- owner "a-strong-password" admin "Shop Owner"
npm run dev                 # http://localhost:5000

# 2. Frontend (new terminal)
cd frontend
cp .env.example .env        # optional: VITE_CURRENCY, VITE_SHOP_NAME
npm install
npm run dev                 # http://localhost:5173
```

Add a cashier from the **Users** page (admin), or: `npm run create-user -- cashier1 "a-strong-password" cashier "Cashier Name"`

Production: `npm run build` in both folders. Serve `frontend/dist` from any web server and run `npm start` in `backend`
(set `VITE_API_URL` before building the frontend if the API is on another address, and `CLIENT_ORIGIN` on the backend).

## Database safety

- The connection string comes only from `MONGODB_URI` in `backend/.env`.
- The app never drops, resets or seeds data. `create-user` only inserts a user when the username is free.
- Nothing important is hard-deleted. Customers, products and users are deactivated. Sales and payments are **archived**
  (with a reason) so they leave all totals but stay in the audit trail. Archiving a sale returns its stock.
- Balances are computed from sales and payments, never stored, so they cannot drift out of sync.
- Every change to money, stock, customers, products and users is written to the activity log.
- Stock is taken with atomic updates and rolled back if a sale fails (works on a standalone MongoDB, no replica set needed).

## Roles

| Area                                             | Admin | Cashier            |
| ------------------------------------------------ | :---: | ------------------ |
| Dashboard, Reports, Users, Activity log          |  yes  | no                 |
| New sale (cash / credit / part-paid)             |  yes  | yes                |
| Sales list and receipts                          |  all  | own sales only     |
| Customers: view, register, edit                  |  yes  | yes                |
| Customers: activate / deactivate                 |  yes  | no                 |
| Debts and recording debt payments                |  yes  | yes                |
| Products: view                                   |  yes  | yes (no cost price) |
| Products: add, edit, adjust stock, deactivate    |  yes  | no                 |
| Archive sales and payments                       |  yes  | no                 |

## API

All routes are under `/api` and need `Authorization: Bearer <token>` except login.

- Auth: `POST /auth/login`, `GET /auth/me`, `POST /auth/change-password`
- Dashboard: `GET /dashboard` (admin)
- Customers: `GET|POST /customers`, `GET|PUT /customers/:id`, `PATCH /customers/:id/status` (admin)
- Products: `GET /products`, `GET /products/categories`, `GET /products/:id`; admin: `POST /products`, `PUT /products/:id`, `PATCH /products/:id/status`, `POST /products/:id/stock`
- Sales: `GET|POST /sales`, `GET /sales/:id`, `POST /sales/:id/archive` (admin)
- Payments: `GET|POST /payments`, `POST /payments/:id/archive` (admin)
- Debts: `GET /debts`
- Reports: `GET /reports/summary?from=YYYY-MM-DD&to=YYYY-MM-DD` (admin)
- Users (admin): `GET|POST /users`, `PUT /users/:id`, `POST /users/:id/reset-password`
- Activity log (admin): `GET /activity-logs`

## Settings (backend/.env)

- `TIMEZONE` decides where "today" starts (default `Africa/Mogadishu`).
- `ALLOW_NEGATIVE_STOCK=true` lets sales go through even when recorded stock is too low.
