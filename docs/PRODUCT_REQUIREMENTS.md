# House In Hands — Product Requirements

**Version:** 1.0  
**Scope:** Nine platform pillars + landlord onboarding of already-occupied properties with tenant invites.

---

## 1. Vision

House In Hands is a Nigerian property technology platform that helps people **find, agree, pay for and manage** homes with clearer costs and digital records — *Property. In Your Hands.*

The product spans marketplace discovery through ongoing property operations, payments, maintenance, services, records and (over time) market intelligence and developer tools.

---

## 2. Personas

| Persona | Goals |
|---|---|
| **Tenant / student** | Find verified homes, apply, sign digitally, pay rent/utilities, raise maintenance, keep records |
| **Landlord** | List vacant units; onboard already-occupied units; invite current tenants; collect rent; manage leases, docs, maintenance |
| **Estate / property manager** | Bulk portfolio ops, occupancy, collections, service coordination |
| **Developer** | Promote projects, manage unit inventory, lead visibility *(phase later)* |
| **Investor / ops admin** | Verify KYC, fees, withdrawals, content, outreach |

---

## 3. Pillar requirements

### 3.1 Property marketplace
**Purpose:** Discover, list and explore properties.

| ID | Requirement | Priority |
|---|---|---|
| MKT-1 | Public browse of **available** verified listings with filters (location, type, price, beds) | P0 — exists |
| MKT-2 | SEO location / house-hunting landing pages | P0 — exists |
| MKT-3 | Listing detail with media, map, apply CTA | P0 — exists |
| MKT-4 | Portal search + recommendations | P0 — exists |
| MKT-5 | **Occupied / management-only** properties must **not** appear on public marketplace | P0 |
| MKT-6 | Saved searches / alerts | P2 |
| MKT-7 | Sales / off-plan inventory (developer) | P2 |

### 3.2 Property management
**Purpose:** Organise property operations and records.

| ID | Requirement | Priority |
|---|---|---|
| PM-1 | Landlord creates/edits property profiles (address, media, rent, amenities, legal settings) | P0 — exists |
| PM-2 | Status: draft / available / pending / occupied | P0 — exists |
| PM-3 | DIY software management of portfolio | P0 — exists |
| PM-4 | Onboard **already owned & occupied** homes for management (no marketplace publish) | P0 — **this release** |
| PM-5 | Assisted / Fully Managed service packages | P1 (commercial + ops process) |
| PM-6 | Multi-unit / estate hierarchy | P2 |

### 3.3 Tenant and occupancy management
**Purpose:** Support tenant, lease and occupancy records.

| ID | Requirement | Priority |
|---|---|---|
| TEN-1 | Tenant applications on available listings | P0 — exists |
| TEN-2 | Digital lease drafts, e-sign, agreement fee | P0 — exists |
| TEN-3 | Occupancy reflected on listing when lease is active | P0 — exists |
| TEN-4 | **Invite current occupant** by email to join an occupied property | P0 — **this release** |
| TEN-5 | Accept invite → link tenant profile to lease without prior application | P0 — **this release** |
| TEN-6 | Tenant directory per landlord (active / pending / past) | P1 |
| TEN-7 | Renewal / expiry pipeline | P1 |

### 3.4 Rent and payments
**Purpose:** Rent, service charges, utilities and tracking.

| ID | Requirement | Priority |
|---|---|---|
| PAY-1 | Rent checkout (Paystack), receipts, wallet credit | P0 — exists |
| PAY-2 | Service dues / utilities | P0 — exists |
| PAY-3 | Auto-pay + rent reminders | P0 — exists |
| PAY-4 | Once invite lease is active, same rent/payment tools apply | P0 |
| PAY-5 | Arrears dashboard / defaulters | P1 — partial |

### 3.5 Maintenance and services
**Purpose:** Requests, repairs, inspections and support.

| ID | Requirement | Priority |
|---|---|---|
| MNT-1 | Tenant/landlord maintenance tickets | P0 — exists |
| MNT-2 | Property services + due charges | P0 — exists |
| MNT-3 | Photo evidence + cost approval workflow | P1 |
| MNT-4 | Vetted provider network | P2 |

### 3.6 Property-as-a-Service
**Purpose:** Connect stakeholders with operational support.

| ID | Requirement | Priority |
|---|---|---|
| PAS-1 | Optional managed services catalogue | P1 |
| PAS-2 | IoT / device hooks (experimental) | P2 — shell exists |
| PAS-3 | SLA packages for Fully Managed clients | P2 |

### 3.7 Real estate data and intelligence
**Purpose:** Property information and market insight.

| ID | Requirement | Priority |
|---|---|---|
| INT-1 | Landlord analytics (occupancy, collections) | P0 — exists |
| INT-2 | Credit score signals for tenants | P1 — exists |
| INT-3 | Market comps / pricing intelligence | P2 |

### 3.8 Developer and investor solutions
**Purpose:** Project promotion, inventory and visibility.

| ID | Requirement | Priority |
|---|---|---|
| DEV-1 | Marketing / FAQ positioning | P0 — content |
| DEV-2 | Developer inventory portal | P2 |
| DEV-3 | Investor interest / data room flows | P2 |

### 3.9 Digital property records
**Purpose:** Property, tenancy, payment and maintenance records.

| ID | Requirement | Priority |
|---|---|---|
| REC-1 | Signed lease PDF + receipt PDFs | P0 — exists |
| REC-2 | KYC document trail | P0 — exists |
| REC-3 | Invite + lease audit trail | P0 — **this release** |
| REC-4 | Property document vault (title, insurance, inspections) | P1 |

---

## 4. Feature: Onboard occupied property + invite current tenant

### 4.1 Problem
Many landlords already have tenants in place. They need House In Hands to **manage** those homes (rent, docs, maintenance) without listing them for new applicants — and they need to **bring the current tenant onto the platform**.

### 4.2 User stories
1. As a landlord, I can add a property I already own that is **occupied**, without publishing it to the marketplace.
2. As a landlord, I can **invite** the current tenant by email with rent and lease dates.
3. As a tenant, I receive an email, create/sign in to an account, accept the invite, and get a lease to sign.
4. After both parties sign (and fee rules apply), the occupancy is **active** and rent/docs/maintenance work like any other lease.

### 4.3 Functional rules
| Rule | Detail |
|---|---|
| Marketplace exclusion | `availabilityStatus: occupied` (and invite-pending management listings) stay off public search |
| No application required | Lease created with `source: landlord_invite`, `applicationId` null |
| Landlord gate | Verified landlord / estate_manager profile |
| Tenant gate | Must accept with a tenant or student profile (create if missing); KYC can be required before full features per existing rules |
| Agreement fee | Same listing legal settings as marketplace leases (HIH or own legal) |
| Expiry | Invites expire after 14 days; landlord can resend / cancel |
| One active invite | One pending invite per listing at a time (cancel previous to send new) |
| Idempotency | Accepting twice does not create duplicate leases |

### 4.4 Flows

**A. Add occupied property**
1. Landlord → My Properties → “Add occupied property”
2. Enter address, rent, period, media, legal settings
3. Save as `occupied` (management only)
4. Optionally invite tenant immediately

**B. Invite tenant**
1. From occupied (or owned) listing → Invite tenant
2. Enter tenant name, email, lease start/end, confirm rent
3. System emails magic link `/portal/invites/{token}`
4. Invite status: `pending`

**C. Tenant accepts**
1. Opens link → login/register if needed
2. Reviews property + proposed terms
3. Accept → lease `pending_signature` + tenant linked
4. Both parties sign in Agreements (existing flow)
5. Lease `active`; listing remains/sets `occupied`

### 4.5 Non-functional
- Audit every invite create/cancel/accept
- Notify landlord on accept
- Do not expose invite tokens in listings APIs
- Mask sensitive data in logs

### 4.6 Out of scope (this release)
- Bulk CSV import
- Skipping e-sign for paper-only “record” leases
- Phone/SMS invite
- Multi-tenant roommates on one invite

---

## 5. Success metrics
- Occupied properties onboarded / month
- Invite send → accept conversion
- Time to active lease after invite
- % occupied leases with successful rent payment within 30 days

---

## 6. Implementation status (codebase)
| Area | Status |
|---|---|
| Marketplace, applications, leases, payments, maintenance | Live |
| In-house KYC AI + admin | Live |
| Occupied onboard + tenant invite | Implemented in this release |
| Developer inventory / market intelligence | Roadmap |
