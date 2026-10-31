/** Content from House In Hands Property Management Model */

export const PM_MANAGEMENT_AREAS = [
  {
    title: "Property management",
    body: "Central property profile, pricing, status, amenities, documents, photos, history and portfolio overview.",
  },
  {
    title: "Tenant management",
    body: "Tenant records, lease dates, payment status, communication, requests, renewals and documents.",
  },
  {
    title: "Rent & payment management",
    body: "Rent schedules, payment tracking, reminders, receipts, reconciliation and service-charge tracking, using appropriately regulated partners where required.",
  },
  {
    title: "Maintenance management",
    body: "Issue reporting, work orders, approvals, service-provider assignment, progress tracking, cost records and maintenance history.",
  },
  {
    title: "Occupancy management",
    body: "Occupied/vacant units, lease expiry alerts, vacancy tracking, renewal pipeline and occupancy rate.",
  },
  {
    title: "Documents & records",
    body: "Digital property files for agreements, inspection records, receipts, service contracts, maintenance evidence and related records.",
  },
  {
    title: "Performance intelligence",
    body: "Income, expenses, occupancy, collection rate, maintenance costs, yield indicators and portfolio-level reporting.",
  },
  {
    title: "Property services",
    body: "Access to vetted/managed service providers for repairs, cleaning, inspection, facilities and other property needs.",
  },
] as const;

export const PM_LIFECYCLE = [
  { n: "01", title: "List", body: "Create property profile, add media, price, amenities, location and availability." },
  { n: "02", title: "Verify", body: "Confirm owner identity, property information and required supporting details before publication." },
  { n: "03", title: "Match", body: "Receive tenant interest and manage enquiries/applications through the platform." },
  { n: "04", title: "Lease", body: "Store lease information, dates, payment schedule and relevant documents." },
  { n: "05", title: "Collect", body: "Track rent and approved charges, issue reminders and maintain payment history." },
  { n: "06", title: "Maintain", body: "Receive issues, assign service providers, approve costs and record completed work." },
  { n: "07", title: "Monitor", body: "Track occupancy, renewals, arrears, expenses and operating performance." },
  { n: "08", title: "Optimise", body: "Use analytics and market intelligence to improve pricing, occupancy and portfolio decisions." },
] as const;

export const PM_DASHBOARD_MODULES = [
  { title: "My Properties", body: "Property count, active listings, occupied/vacant status, pricing, location and quick actions.", href: "/portal/listings" },
  { title: "Rent & Collections", body: "Paid, due, overdue, next payment date, collection rate and statements.", href: "/portal/payments" },
  { title: "Tenants", body: "Current tenants, lease status, renewal dates, outstanding balances and communication.", href: "/portal/applications" },
  { title: "Maintenance", body: "Open requests, priority, assigned provider, approval status, cost and completion.", href: "/portal/maintenance" },
  { title: "Occupancy", body: "Occupied vs vacant units, upcoming lease expirations and vacancy duration.", href: "/portal/analytics" },
  { title: "Documents", body: "Property agreements, leases, inspection reports, receipts and other records.", href: "/portal/agreements" },
  { title: "Analytics", body: "Income, expenses, occupancy, yield indicators, maintenance spend and trends.", href: "/portal/analytics" },
  { title: "Notifications", body: "Lease expiry, overdue rent, maintenance updates and important actions.", href: "/portal/notifications" },
] as const;

export const PM_SERVICE_LEVELS = [
  {
    title: "DIY / Self-Managed",
    body: "Landlord uses HIH software to manage listings, tenants, rent, maintenance and reporting directly.",
    bestFor: "Individual landlords and small portfolios",
  },
  {
    title: "Assisted Management",
    body: "HIH provides tools plus selected support, service coordination and operational assistance.",
    bestFor: "Busy owners and growing portfolios",
  },
  {
    title: "Fully Managed",
    body: "Landlord delegates agreed operational responsibilities to HIH-managed staff/partners under a formal property-management arrangement.",
    bestFor: "Investors, developers and larger portfolios",
  },
] as const;

export const PM_MAINTENANCE_STAGES = [
  "Report — Tenant submits issue with description, photos/video and location.",
  "Triage — Category and priority: emergency, urgent, routine or inspection.",
  "Review — Landlord/property manager reviews scope and expected cost.",
  "Assign — Approved service provider selected from the verified network.",
  "Execute — Provider updates status, uploads evidence and records work.",
  "Approve — Landlord approves completion and applicable charge.",
  "Pay & close — Payment through the appropriate workflow; ticket closed.",
  "Record — History stays attached to the property for analytics.",
] as const;

export const PM_PROMISE =
  "You do not need to manage your property through scattered messages, spreadsheets and payment records. House In Hands gives you a central digital platform to manage your portfolio, tenants, rent, maintenance, occupancy, services and performance.";
