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
| PM-4a | Uploaded properties are **not approved immediately** — AI reviews details/media; if not satisfied escalate to admin with **email + in-app** notifications; human admin is final marketplace gate | P0 — **this release** |
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
| TEN-5 | Accept invite → create approved **application** + lease; link tenant to property | P0 — **this release** |
| TEN-5a | Invite accept shows **landlord identity** + required **legal acknowledgement** | P0 — **this release** |
| TEN-6 | Tenant directory per landlord (active / pending / past) | P1 |
| TEN-7 | Renewal / expiry pipeline | P1 |
| TEN-8 | **My Home** hub: property, cost, docs, history, conversations, bills, exit | P0 — **this release** |
| TEN-9 | Tenant can request early exit; landlord can issue exit/vacate notice | P0 — **this release** |
| TEN-10 | Exit notices: AI screen + human legal/ops review before serve + legal PDF | P0 — **this release** |
| TEN-11 | Admin/legal decide remaining-rent refund on early exit / unpaid rent | P0 — **this release** |

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
| MNT-1a | Invited occupants can raise repair/maintenance once lease is linked (`pending_signature` or `active`) | P0 — **this release** |
| MNT-2 | Property services + due charges | P0 — exists |
| MNT-3 | Photo evidence + cost approval workflow | P1 — partial via building issues |
| MNT-4 | Vetted provider network | P2 |
| MNT-5 | **Building issues** reported by tenants → **AI Property Manager** validates proof, escalates to landlord with recommended actions, tracks until closed | P0 — **this release** |

### 3.6 Property-as-a-Service
**Purpose:** Connect stakeholders with operational support.

| ID | Requirement | Priority |
|---|---|---|
| PAS-1 | Optional managed services catalogue | P1 |
| PAS-2 | IoT / device hooks (experimental) | P2 — shell exists |
| PAS-3 | SLA packages for Fully Managed clients | P2 |
| PAS-4 | **Public website AI chat** — answers about House In Hands, verified listings & platform topics; reply language: English, Yoruba, Hausa, Pidgin, Arabic, Igbo | P0 — **this release** |
| PAS-5 | **Portal AI Assistant** — manage/remind/receipts/forecast/recommend; **not legal advice**; same reply languages as PAS-4 | P0 — **this release** |
| PAS-6 | **Public waitlist** — capture email + phone for official launch notifications | P0 — **this release** |

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
3. As a tenant, I receive an email, create/sign in, **verify the landlord identity**, acknowledge legal invite terms, accept, and get added to the **application + property/lease** records.
4. As an invited tenant, I can raise **repair / maintenance** service requests on that property once the lease is linked (even before both signatures complete).
5. After both parties sign (and fee rules apply), the occupancy is **active** and rent/docs work like any other lease.

### 4.3 Functional rules
| Rule | Detail |
|---|---|
| Marketplace exclusion | `availabilityStatus: occupied` (and invite-pending management listings) stay off public search |
| Tenancy records on accept | Creates `Application` (`source: landlord_invite`, `status: approved`) **and** `Lease` (`source: landlord_invite`, linked `applicationId`) |
| Landlord identity | Accept screen shows landlord display/KYC name, email, phone (if set), verification status |
| Legal acknowledgement | Tenant must check confirm against fixed text (`TENANT_INVITE_LEGAL_VERSION`); stored on invite (`legalAcknowledgedAt`, `legalAcknowledgementText`) |
| Landlord gate | Verified landlord / estate_manager profile |
| Tenant gate | Must accept with a tenant or student profile (create if missing); email on invite must match signed-in user |
| Agreement fee | Same listing legal settings as marketplace leases (HIH or own legal) |
| Maintenance | Linked lease (`pending_signature` or `active`) grants property access for service requests |
| Expiry | Invites expire after 14 days; landlord can resend / cancel |
| One active invite | One pending invite per listing at a time (cancel previous to send new) |
| Idempotency | Accepting twice does not create duplicate leases / applications |

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
1. Opens link → login/register if needed (must use invited email)
2. Reviews **landlord identity card**, property, proposed terms, and legal acknowledgement
3. Checks acknowledgement → Accept → approved application + lease `pending_signature`; tenant linked to property
4. Can open Maintenance for repair/service requests; sign agreement in Agreements
5. Both parties sign; lease `active`; listing remains/sets `occupied`

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

## 5. Feature: My Home + exit notices + remaining-rent refunds

### 5.1 Problem
Tenants need one place to see their occupied home (property, cost, documents, history, conversations, bills) and a clear path to exit. Landlords need to issue exit notices grounded in the tenancy agreement — but notices must not go straight to the tenant: **AI + human legal/ops** must review first, with a legal PDF. When rent is unpaid or prepaid and a quick exit is needed, **admin/legal** decide any remaining-rent refund against the agreement.

### 5.2 User stories
1. As a tenant, I open **My Home** and see my property, rent cost, agreement/exit PDFs, payment & utility history, linked conversations, and exit status.
2. As a landlord, I submit an exit / vacate notice citing agreement grounds and a proposed vacate date.
3. As a tenant, I can request early exit on an active lease.
4. As HIH AI + legal/ops, I screen and approve/reject notices; only then is the notice **served** to the tenant with a downloadable legal PDF.
5. As admin/legal, when prepaid/unpaid rent and early exit collide, I approve, adjust, or deny a remaining-rent refund to the tenant wallet based on the agreement.

### 5.3 Functional rules
| Rule | Detail |
|---|---|
| My Home | Tenant/student only; aggregates active & past leases via `/api/portal/home` |
| Notice gate | Active leases only; one open notice per lease |
| AI screen | `reviewExitNoticeWithAi` → recommendation stored; **never auto-serves** |
| Human review | Admin `legal:write` → approve & serve / reject |
| Tenant visibility | Landlord-issued notices hidden until `served` |
| Legal PDF | Generated from stored notice terms (`EXIT-*` document) |
| Lease end | Admin “complete” → lease `terminated`; occupied listing may return to `available` |
| Remaining rent | Suggested prorata from paid current period; unpaid flags `refundStatus: pending_admin` |
| Refund money | Admin credits tenant wallet / debits landlord wallet; audited |

### 5.4 Flows
**My Home** → tenant opens `/portal/home`  
**Issue / request** → `/portal/exit-notices` → pending_review  
**Admin** → `/admin/exit-notices` → Approve & serve → tenant notified + PDF  
**Tenant** → acknowledge served notice  
**Refund** → admin refund queue → refund / deny  
**Complete** → terminate lease

---

## 6. Feature: Building issues + AI Property Manager

### 6.1 Flow
1. Tenant reports issue on a leased property (+ optional proof photos).
2. **AI Property Manager** reviews text + images → escalate / needs more proof / dismiss.
3. On escalate: landlord notified with **recommended actions**; linked maintenance ticket created.
4. Landlord acknowledges, records action taken, updates until resolved.
5. Tenant or landlord closes the case; timeline + audit retained.

### 6.2 Surfaces
- Tenant/landlord: `/portal/building-issues`
- APIs: `/api/portal/building-issues`, upload, `[id]` patch
- Model: `BuildingIssue`

---

## 7. Success metrics
- Occupied properties onboarded / month
- Invite send → accept conversion
- Time to active lease after invite
- % occupied leases with successful rent payment within 30 days
- Exit notice submit → serve conversion; median review time
- Remaining-rent refunds decided within SLA

---

## 8. Implementation status (codebase)
| Area | Status |
|---|---|
| Marketplace, applications, leases, payments, maintenance | Live |
| In-house KYC AI + admin | Live |
| Occupied onboard + tenant invite (application link, legal ack, maintenance) | Implemented in this release |
| My Home hub + exit notices (AI + legal review + refund) | Implemented in this release |
| Building issues + AI Property Manager (proof → escalate → close) | Implemented in this release |
| Listing AI review + admin escalate/email (no auto-approve) | Implemented in this release |
| Public AI chat + Portal AI Assistant (not legal advice; EN/Yoruba/Hausa/Pidgin/Arabic/Igbo) | Implemented in this release |
| Public waitlist (email + phone, launch notify) | Implemented in this release |
| Developer inventory / market intelligence | Roadmap |
