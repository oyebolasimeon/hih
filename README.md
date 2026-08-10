# House In Hand

Property rental and management platform — public site, authenticated app, admin console.

## Stack

Next.js 16 · React 19 · MongoDB/Mongoose · NextAuth · Cloudinary · Redis · Prembly KYC · Paystack

## Surfaces

| Surface | Path |
|---|---|
| Public website | `/` |
| App | `/portal` |
| Admin | `/admin` |

## Setup

```bash
npm install
cp .env.example .env.local
# MongoDB, AUTH_SECRET, ADMIN_EMAILS required
# Prembly: PREMBLY_APP_ID + PREMBLY_API_KEY (or PREMBLY_MOCK=true)
# Paystack: PAYSTACK_SECRET_KEY (or PAYSTACK_MOCK=true)
npm run dev
```

## Feature map (PRD phases)

### Phase 1 — MVP
- Identity: register, email verify, phone OTP, multi-profile, Prembly KYC, RBAC
- Marketplace: listings CRUD, search/filters, admin verify, public teaser
- Lifecycle: applications → agreements/e-sign → occupancy
- Payments: Paystack rent init/verify (mock supported)
- Trust: notifications, fraud reports, audit logs, verified badges
- Website + CMS: pages, blog/FAQ/testimonials admin

### Phase 2
- Utilities bills + pay · Savings goals · In-app messaging · Reviews/ratings

### Phase 3
- Estate/landlord analytics dashboard

### Phase 4
- Heuristic credit score · Listing recommendations

### Phase 5–6
- IoT devices (lock/meter mock commands) · Maintenance requests + insights

## Typical renter flow

1. Register → create Tenant/Student profile → `/portal/kyc`
2. Search → apply → landlord approves → both sign agreement
3. Pay rent via `/portal/payments`

## Typical landlord flow

1. Landlord profile + KYC → create listing → submit for verification
2. Review applications → sign lease → track payments / analytics
