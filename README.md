# House In Hand

Property rental and management platform — public website, authenticated app, and admin console.

Built on the Nova Elite codebase shell (Next.js App Router, MongoDB, NextAuth, Cloudinary, Redis, admin RBAC). Domain models and product flows are House In Hand.

## Stack

- **Frontend:** Next.js 16, React 19, Tailwind 4
- **DB:** MongoDB + Mongoose
- **Auth:** NextAuth v5 (JWT) + admin RBAC
- **Media:** Cloudinary
- **Email:** Nodemailer / Google SMTP
- **Cache:** Redis (OTP / reset tokens)

## Surfaces

| Surface | Path |
|---|---|
| Public website | `/`, `/how-it-works`, `/listings`, `/blog`, `/faq`, … |
| App (authenticated) | `/portal` |
| Admin console | `/admin` |

## Getting started

```bash
npm install
cp .env.example .env.local
# set MONGODB_URI, AUTH_SECRET, ADMIN_EMAILS, SMTP, Cloudinary, etc.
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## MVP directions (see `hihPRD`)

1. Identity — multi-profile + KYC
2. Listings marketplace
3. Applications & digital leases
4. Rent payments (Paystack / Flutterwave)
5. Public website + CMS (in progress under `/admin/content`)
