# Surety — Trust-Based Service Marketplace (Kenya)

A trust-first service marketplace connecting verified service providers ("fundis" — electricians, plumbers, cleaners, tutors, etc.) with customers across Kenya. Built around three pillars that existing platforms lack: **real verification**, **in-app booking with payment**, and **genuine accountability** (reviews + disputes).

## ✨ Features

### Trust & Verification
- Providers upload national ID/passport + optional skill certificates
- Admin review queue with approve/reject + reason
- Verified badge on public profiles
- **Unverified providers cannot appear in search or accept bookings**

### Booking & Quoting
- Full booking lifecycle: `REQUESTED → QUOTED → ACCEPTED → IN_PROGRESS → COMPLETED → PAID → REVIEWED` (+ `CANCELLED`, `DISPUTED` branches)
- Quote-based pricing (provider sets price per job)
- In-booking message thread between customer and provider

### Payments (M-Pesa Sandbox)
- Abstract `PaymentProvider` interface — M-Pesa is the first implementation, ready for Flutterwave/Paystack/Stripe
- STK Push for customer payments, B2C for provider payouts
- Escrow logic — payment held until job completion
- 10% platform commission (configurable)
- **Sandbox mode by default — runs fully without real M-Pesa credentials**

### Reviews & Accountability
- Only customers with `completed + paid` bookings can review (no fake reviews)
- Auto-recalculated average ratings
- Provider can respond once per review

### Dispute Resolution
- Either party can open a dispute with reason + evidence photos
- Admin queue with full booking/message context
- Resolutions: refund customer, release payment, partial split, or request more info

### Admin Dashboard (real-time)
- Auto-refreshing KPI cards (users, signups, bookings, revenue, commission, ratings, disputes, tickets)
- Live activity feed via WebSocket
- Charts: bookings over time, revenue over time, category popularity
- Drill-down queues for verification and disputes

### Multi-Country Ready (Kenya launch, global architecture)
- `countryCode` on every entity (users, categories, bookings)
- Currency-aware money handling (no hardcoded KES)
- `PaymentProvider` interface for per-region payment methods
- ID verification modeled as `document_type + issuing_country`
- i18next localization (English + Swahili skeleton)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (tested on v24)
- npm 10+ (uses npm workspaces)

### Setup (3 commands)

```bash
# 1. Install dependencies (from project root)
npm install

# 2. Set up the database & seed sample data
cd backend
npx prisma generate
npx prisma db push
npx prisma db seed
cd ..

# 3. Start both frontend + backend (in separate terminals)
npm run dev:backend    # API on http://localhost:4000
npm run dev:frontend   # UI on http://localhost:5173
```

Then open **http://localhost:5173** in your browser.

### Demo Accounts (seeded)

The database is pre-seeded with sample data so the dashboard isn't empty on first run. Login with any of these phone numbers — in mock OTP mode, the verification code is shown on screen.

| Role | Phone | Notes |
|------|-------|-------|
| **Admin** | `+254700000000` | Full dashboard access |
| Customer | `+254711111111` | Wanjiku Kamau |
| Customer | `+254722222222` | Otieno Ochieng |
| Customer | `+254733333333` | Aisha Mohammed |
| Provider (Verified) | `+254744444444` | James Mwangi — Electrician |
| Provider (Verified) | `+254755555555` | Grace Wairimu — Plumber |
| Provider (Pending) | `+254766666666` | Peter Njoroge — Painter |
| Provider (Rejected) | `+254777777777` | Fatuma Hassan — Cleaner |
| Provider (Unverified) | `+254788888888` | David Kiprop — Tech Repair |

**OTP:** In dev mode, after entering a phone number and clicking "Send OTP", the 6-digit code appears in a yellow banner on the login screen.

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS |
| Charts | Recharts |
| Real-time | Socket.IO (client) |
| i18n | i18next + react-i18next |
| Backend | Node.js + Express + TypeScript |
| Database | SQLite (dev) / PostgreSQL (prod) via Prisma ORM |
| Auth | JWT + phone/OTP (mock in dev) |
| Payments | M-Pesa Daraja API (sandbox mode) |
| File uploads | Multer (local disk, S3-ready) |
| Real-time | Socket.IO (server) |

## 📁 Project Structure

```
surety/
├── backend/
│   ├── prisma/schema.prisma     # 15 database models
│   ├── seeds/seed.ts            # Sample data (5 providers, 3 customers, 10 bookings)
│   ├── src/
│   │   ├── routes/              # 11 route files (auth, bookings, payments, admin, etc.)
│   │   ├── middleware/auth.ts   # JWT + role guard + rate limiter
│   │   ├── utils/payments.ts    # PaymentProvider interface + MPesaSandboxProvider
│   │   ├── db.ts                # Prisma client
│   │   └── index.ts             # Express + Socket.IO server
│   └── .env                     # Config (sandbox mode by default)
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── auth/            # Login, Signup
│   │   │   ├── customer/        # Home, Search, Profile, Booking, Reviews, Support
│   │   │   ├── provider/        # Dashboard, Onboarding wizard
│   │   │   └── admin/           # Dashboard, Verification, Disputes
│   │   ├── components/          # Layout, StarRating, StatusBadge
│   │   ├── context/             # AuthContext
│   │   ├── services/api.ts      # Axios API client
│   │   └── i18n/                # English + Swahili locales
│   └── vite.config.ts           # Dev proxy to backend
└── package.json                 # npm workspaces
```

## 🔧 Configuration

### Environment Variables

Backend (`backend/.env`):
```
DATABASE_URL="file:./dev.db"          # SQLite for dev; use postgresql:// for prod
JWT_SECRET="change-me-in-production"
PORT=4000
MPESA_ENV=sandbox                     # sandbox | production
DEFAULT_COMMISSION_RATE=0.10          # 10%
OTP_MOCK=true                         # Shows OTP on screen in dev
FRONTEND_URL=http://localhost:5173
```

Frontend (`frontend/.env`):
```
VITE_API_URL=http://localhost:4000
VITE_SOCKET_URL=ws://localhost:4000
```

### Switching to PostgreSQL (production)

1. Install PostgreSQL and create a database
2. Update `backend/.env`:
   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/surety"
   ```
3. Run:
   ```bash
   cd backend
   npx prisma migrate deploy
   npx prisma db seed
   ```

### Switching to production M-Pesa

1. Register on the [Safaricom Daraja portal](https://developer.safaricom.co.ke/)
2. Get your Consumer Key, Consumer Secret, Passkey, and Paybill/Till number
3. Update `backend/.env`:
   ```
   MPESA_ENV=production
   MPESA_CONSUMER_KEY=your-real-key
   MPESA_CONSUMER_SECRET=your-real-secret
   MPESA_PASSKEY=your-real-passkey
   MPESA_BUSINESS_SHORTCODE=your-paybill
   MPESA_CALLBACK_URL=https://yourdomain.com/api/payments/mpesa-callback
   ```
4. Uncomment the production Daraja API code in `backend/src/utils/payments.ts`

## 📊 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/signup` | Register (customer/provider) |
| POST | `/api/auth/login` | Send OTP |
| POST | `/api/auth/verify-otp` | Verify OTP, get JWT |
| GET | `/api/categories` | List service categories |
| GET | `/api/providers` | Search providers (filters) |
| GET | `/api/providers/:id` | Provider profile |
| POST | `/api/providers/onboarding` | Provider onboarding |
| POST | `/api/providers/:id/verify` | Admin: approve/reject |
| GET | `/api/providers/verification/queue` | Admin: pending verifications |
| POST | `/api/bookings` | Create booking |
| GET | `/api/bookings` | List my bookings |
| POST | `/api/bookings/:id/quote` | Provider: submit quote |
| POST | `/api/bookings/:id/accept-quote` | Customer: accept |
| POST | `/api/bookings/:id/complete` | Provider: complete |
| POST | `/api/payments/initiate` | Customer: pay (M-Pesa) |
| POST | `/api/payments/payout/:bookingId` | Provider: payout |
| POST | `/api/reviews` | Customer: leave review |
| POST | `/api/disputes` | Open dispute |
| POST | `/api/disputes/:id/resolve` | Admin: resolve |
| GET | `/api/admin/kpis` | Dashboard KPIs |
| GET | `/api/admin/bookings-chart` | Bookings over time |
| GET | `/api/admin/revenue-chart` | Revenue over time |
| GET | `/api/admin/category-chart` | Category popularity |
| GET | `/api/admin/activity` | Activity log |

## 🗄️ Database Schema

15 models: `User`, `OtpRecord`, `Provider`, `VerificationDocument`, `ServiceCategory`, `ProviderCategory`, `PortfolioPhoto`, `Booking`, `BookingMessage`, `Payment`, `Review`, `Dispute`, `DisputeEvidence`, `SupportTicket`, `ActivityLog`.

View/edit with Prisma Studio:
```bash
npm run db:studio
```

## 🌍 Multi-Country Expansion

The architecture supports adding new countries as a config/data change, not a rewrite:
- **Payments:** Implement the `PaymentProvider` interface per region
- **Currency:** Every amount is stored with a currency code
- **Geography:** `countryCode` on users, categories, bookings
- **Verification:** Documents modeled as `document_type + issuing_country`
- **i18n:** All UI strings in locale files (add Swahili/other languages in `frontend/src/i18n/locales/`)

## 📝 What's Left for Launch

Only operational tasks remain — **no functional code work needed**:

1. **Production M-Pesa credentials** — Get real Daraja API keys (instructions above)
2. **Real domain & SSL** — Purchase domain, configure DNS, install TLS certificate
3. **Hosting/deployment** — Deploy backend (e.g., Render, Railway, DigitalOcean) and frontend (e.g., Vercel, Netlify), or self-host
4. **Real SMS OTP provider** — Replace mock OTP with an SMS gateway (e.g., Africa's Talking) by implementing the OTP dispatch in `backend/src/routes/auth.ts`
5. **File storage** — Swap local disk uploads for S3-compatible storage (Cloudflare R2, AWS S3) in `backend/src/routes/uploads.ts`
6. **Regulatory review (per new country)** — Financial services licensing, data protection law compliance (Kenya's DPA, GDPR equivalents), tax handling — **business task, not code**

## 🧪 Testing the Flows

1. **Customer flow:** Login as `+254711111111` → Search → Click a provider → Book → View in My Bookings
2. **Provider flow:** Login as `+254744444444` → Dashboard → Open a REQUESTED booking → Submit Quote
3. **Payment flow:** As customer, accept quote → Pay Now (sandbox auto-confirms in 2s)
4. **Admin flow:** Login as `+254700000000` → Dashboard → Review charts/activity → Verification queue → Disputes

## 📄 License

MIT — Built as a reference implementation for the Kenyan service marketplace.
