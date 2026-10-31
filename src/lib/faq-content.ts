export type FaqEntry = { q: string; a: string };
export type FaqSection = { id: string; title: string; items: FaqEntry[] };

export const FAQ_SECTIONS: FaqSection[] = [
  {
    id: "general",
    title: "General Questions",
    items: [
      {
        q: "What is House In Hands?",
        a: "House In Hands is a property technology platform designed to make housing transactions and property management simpler, more transparent and more accessible. It connects people, properties, payments, services and property operations in one trusted digital environment.",
      },
      {
        q: "What does “agent-free” mean?",
        a: "Our core rental workflow is designed to connect verified landlords and tenants directly, reducing dependence on traditional middlemen. Property professionals and service providers may still participate where a user chooses or where a service requires them.",
      },
      {
        q: "Who is House In Hands for?",
        a: "Tenants, students, landlords, property managers, developers, estate builders, investors and other property professionals can use or partner with the platform according to their needs.",
      },
      {
        q: "Is House In Hands a website or an app?",
        a: "The platform is designed to work across web and mobile experiences so users can access their relevant property functions from wherever they are.",
      },
      {
        q: "What locations does House In Hands serve?",
        a: "The platform is focused on Nigeria, with operations and onboarding expanding by market. Availability of listings and specific services can vary by city and launch stage.",
      },
      {
        q: "Is it free to use?",
        a: "Account registration for tenants and students is intended to be free. Listing, subscription, transaction and managed-service fees depend on the applicable product or plan and are presented before commitment.",
      },
      {
        q: "How does House In Hands make money?",
        a: "The business model can include transparent platform or transaction fees, subscription plans for larger property portfolios, property-management services, property services, and business or data products. Applicable charges are disclosed before payment or commitment.",
      },
    ],
  },
  {
    id: "tenants",
    title: "For Tenants",
    items: [
      {
        q: "How do I find a home?",
        a: "Create an account, complete the required identity verification, then search by location, price, bedrooms, amenities and other available filters. Listings are designed to show the information needed to make an informed decision and support direct communication with the landlord.",
      },
      {
        q: "Are listings verified?",
        a: "House In Hands uses identity/KYC checks for participating users and applies property/listing review processes. Verification should be understood in terms of the checks actually stated for a listing; tenants should still inspect the property and review relevant documents before committing.",
      },
      {
        q: "Will I pay an agent commission?",
        a: "The direct rental workflow is designed to avoid traditional agent commission. Any House In Hands platform or service fee that applies is shown separately and transparently.",
      },
      {
        q: "Can I see the full cost before I apply?",
        a: "Yes. The platform is designed to show rent and applicable charges such as service charges, deposits, legal or other disclosed fees upfront where they apply.",
      },
      {
        q: "How do I apply for a property?",
        a: "Open a listing, review the property and terms, communicate with the landlord where needed, complete the application and provide any required information or documents. The landlord can then review and respond through the platform.",
      },
      {
        q: "How does the digital lease work?",
        a: "Where digital leasing is enabled, the tenancy terms are generated or organized within the platform, reviewed by the parties, signed electronically where supported, and stored for future reference.",
      },
      {
        q: "Can I pay rent through House In Hands?",
        a: "Yes, rent-payment functionality is part of the platform. The exact payment flow, available methods and settlement process depend on the service enabled for the transaction and applicable financial-partner arrangements.",
      },
      {
        q: "Can I pay utilities and service charges?",
        a: "The platform is designed to support property-related payments such as electricity, water and service charges where those services are available in the user’s location or through an enabled partner integration.",
      },
      {
        q: "What if something breaks after I move in?",
        a: "You can raise a maintenance request through the platform where maintenance management is enabled. The request can be logged, tracked, assigned or approved, and the resulting work and cost can be recorded against the property.",
      },
      {
        q: "What if my landlord becomes unresponsive?",
        a: "Use the platform support or dispute process to report the issue. Platform communications and relevant records can help create a clear history for review and escalation.",
      },
      {
        q: "What happens if I have a dispute?",
        a: "House In Hands provides a dispute-resolution workflow in which the parties can submit the issue and supporting evidence. Matters may be escalated as appropriate, including to legal or other formal processes where required.",
      },
    ],
  },
  {
    id: "students",
    title: "For Students",
    items: [
      {
        q: "Can students search specifically for rooms and hostels?",
        a: "Yes. Student-focused discovery can include filters such as institution, distance from campus, room type and availability, subject to the listings and features available in the relevant market.",
      },
      {
        q: "How does House In Hands help students avoid scams?",
        a: "Student listings are intended to be tied to verified user accounts and platform checks, reducing exposure to anonymous or unverified parties. Students should still complete the platform process and avoid off-platform payments requested outside approved channels.",
      },
      {
        q: "Can students pay for accommodation digitally?",
        a: "Where payment functionality is enabled, students can use the available digital payment flow and retain transaction records within the platform.",
      },
    ],
  },
  {
    id: "landlords",
    title: "For Landlords & Property Owners",
    items: [
      {
        q: "How do I list my property?",
        a: "Register as a landlord, complete the required KYC/verification steps, then add the property with photos, location, rent, service charges, amenities, availability and other required information. The listing is reviewed according to the platform’s verification process before publication.",
      },
      {
        q: "Can I list more than one property?",
        a: "Yes. House In Hands is designed to support multiple properties and portfolio management, allowing landlords to organize properties, tenants, payments, maintenance and occupancy from one dashboard.",
      },
      {
        q: "Can I manage my property from another city or country?",
        a: "Yes. Remote management is a core use case. Landlords can monitor property information, tenant activity, payment status, maintenance requests, occupancy and other available controls from an internet-connected device.",
      },
      {
        q: "What aspects of my property can I manage?",
        a: "The management system is designed around eight core areas: property records, tenant management, rent and collections, maintenance, occupancy, documents, property services, and property-performance analytics.",
      },
      {
        q: "How does tenant management work?",
        a: "Landlords can keep tenant profiles, lease details, payment history, communication records, maintenance requests and renewal information together against the relevant property.",
      },
      {
        q: "How does rent collection work?",
        a: "Tenants can pay through the enabled digital payment workflow. Landlords receive transaction records and notifications, with settlement to the registered account following the applicable payment process.",
      },
      {
        q: "How does maintenance management work?",
        a: "A tenant can report a fault with supporting details. The landlord can review, approve, assign or monitor the request, while the platform can retain the maintenance history and related costs.",
      },
      {
        q: "Can I monitor occupancy?",
        a: "Yes. The platform is designed to show occupied, vacant and upcoming-vacancy units, together with lease-expiry and availability information where those features are enabled.",
      },
      {
        q: "Can I keep property documents on the platform?",
        a: "Yes. The property-management workflow is designed to organize relevant property and tenancy records, agreements, inspection records, receipts and other documents in a structured digital record.",
      },
      {
        q: "Can House In Hands manage the property for me?",
        a: "The platform supports both self-managed and service-assisted models. Depending on the product or partnership arrangement, House In Hands can help coordinate property operations such as tenant support, maintenance and related services. The exact scope should be defined in the applicable service agreement.",
      },
      {
        q: "Can I use House In Hands for a whole property portfolio?",
        a: "Yes. Portfolio tools are designed for landlords and managers with multiple units, including consolidated occupancy, rent, tenant, maintenance and performance information.",
      },
      {
        q: "Can I see how each property is performing?",
        a: "Property analytics can help organize income, expenses, occupancy, maintenance activity and other portfolio metrics. More advanced market or investment intelligence may be offered as the analytics product evolves.",
      },
    ],
  },
  {
    id: "developers",
    title: "For Developers & Estate Builders",
    items: [
      {
        q: "Can developers list an entire estate or development?",
        a: "Yes. House In Hands is designed to support bulk listing and portfolio inventory for developments, including unit type, pricing, availability, features and other project information.",
      },
      {
        q: "How can HIH help developers sell or rent units?",
        a: "Developers can use the platform as a digital distribution channel to showcase projects, reach prospective customers, organize enquiries, monitor inventory and connect property marketing with occupancy or post-transaction management.",
      },
      {
        q: "Can developers manage unit availability?",
        a: "Yes. A development can be structured as an inventory portfolio so available, reserved, occupied or otherwise categorized units can be monitored from a central view where enabled.",
      },
      {
        q: "Can developers get market intelligence?",
        a: "The platform is designed to develop property intelligence products that can help developers understand pricing, demand, occupancy, rental trends and location-level signals. Access and depth of data will depend on the product offered and applicable data-governance requirements.",
      },
      {
        q: "Do you offer partnership packages for large portfolios?",
        a: "Yes. Large landlords, property managers and developers can discuss tailored partnership arrangements, including onboarding support, portfolio tools and other commercial terms based on scope and volume.",
      },
    ],
  },
  {
    id: "managers",
    title: "For Property Managers",
    items: [
      {
        q: "What can a property manager manage on HIH?",
        a: "A property manager can organize multiple properties, tenants, leases, rent status, maintenance requests, occupancy, documents, service activities and performance information from a portfolio-level workflow.",
      },
      {
        q: "Can I manage properties owned by different landlords?",
        a: "The platform is designed to support portfolio-based management. The exact permissions, account structure and reporting available should match the management mandate and applicable plan or service agreement.",
      },
      {
        q: "Can I track maintenance across a portfolio?",
        a: "Yes. Maintenance requests can be logged against individual properties and monitored across the broader portfolio, including status and recorded cost where the feature is enabled.",
      },
    ],
  },
  {
    id: "payments",
    title: "Payments, Escrow & Financial Services",
    items: [
      {
        q: "What financial services are planned or supported?",
        a: "The broader platform is designed to support rent payment, digital collections, utility payments, installment-oriented payment flows and escrow-related transaction workflows, subject to the service available and applicable regulatory requirements.",
      },
      {
        q: "Does House In Hands hold customer money?",
        a: "Payment and escrow arrangements must follow the applicable financial-regulatory structure. Where a regulated payment or escrow partner is used, that partner may handle custody, settlement or other regulated functions while House In Hands manages the relevant technology workflow.",
      },
      {
        q: "Can rent be paid in installments?",
        a: "Installment payment functionality may be available through an appropriate financial or payment partner. Availability depends on the product, eligibility, commercial terms and applicable regulation.",
      },
      {
        q: "Are utility payments supported?",
        a: "Yes, utility and property-related payments can be part of the platform where the required service integration is available.",
      },
    ],
  },
  {
    id: "trust",
    title: "Trust, Verification & Safety",
    items: [
      {
        q: "What is KYC and why is it required?",
        a: "KYC means Know Your Customer. House In Hands uses identity verification to help establish who users are before they participate in the platform. Verification requirements can include approved identity data such as BVN and/or NIN where applicable.",
      },
      {
        q: "Does a verified landlord mean the property title is guaranteed?",
        a: "No. User identity verification and listing checks should not be interpreted as a legal guarantee of title or a substitute for property due diligence. Users should review relevant ownership, tenancy and legal documents before making a commitment.",
      },
      {
        q: "Can I pay a landlord outside the platform?",
        a: "Users are strongly encouraged to use the approved payment workflow for transactions that the platform supports. Requests to move a transaction off-platform should be treated cautiously and may remove important platform protections or records.",
      },
      {
        q: "How does House In Hands handle fraud or suspicious activity?",
        a: "The platform can combine identity checks, listing review, transaction records, user reports and operational controls to identify and respond to suspicious activity. Report suspected fraud through the official support channel immediately.",
      },
      {
        q: "Is my personal information safe?",
        a: "House In Hands is designed to protect personal and transaction information through appropriate security, access-control and data-protection measures. Detailed processing practices are set out in the applicable Privacy Policy and data-protection notices.",
      },
    ],
  },
  {
    id: "intelligence",
    title: "Property Data, Analytics & Intelligence",
    items: [
      {
        q: "What is property intelligence on House In Hands?",
        a: "Property intelligence is the analysis of property, rental, occupancy, location and transaction-related information to help users understand markets and make better decisions.",
      },
      {
        q: "Who can use property intelligence?",
        a: "Potential users include landlords, developers, investors, property managers, analysts and other approved business users, depending on the product and access level.",
      },
      {
        q: "What can the data help with?",
        a: "It can support pricing analysis, rental comparisons, occupancy monitoring, portfolio performance, market research, location analysis and investment decision support.",
      },
      {
        q: "Will House In Hands sell my personal information?",
        a: "Personal data should only be processed and disclosed in accordance with applicable law, the platform’s privacy terms and the purpose for which it was collected. Any commercial data products should be designed around lawful, appropriately governed and preferably aggregated or anonymized information rather than unauthorized disclosure of personal data.",
      },
      {
        q: "Will House In Hands use AI?",
        a: "AI and analytics can be used to improve search, fraud detection, market intelligence, property-performance analysis and other workflows as the platform evolves. Any automated decision-making that affects individuals should be subject to appropriate safeguards and applicable requirements.",
      },
    ],
  },
  {
    id: "support",
    title: "Getting Started & Support",
    items: [
      {
        q: "How do I sign up?",
        a: "Visit www.houseinhands.com, choose the relevant user type, create your profile, complete the required verification and follow the onboarding steps for your role.",
      },
      {
        q: "What information will I need?",
        a: "Requirements depend on whether you are a tenant, landlord, developer, property manager or another stakeholder. Identity information, contact details and relevant property or business information may be required.",
      },
      {
        q: "What if my city or property type is not yet supported?",
        a: "Register your interest and contact House In Hands. Demand from users and stakeholders helps inform expansion priorities and future service availability.",
      },
      {
        q: "How do I report a problem or ask a question?",
        a: "Email houseinhandsmail@gmail.com or call +234 701 507 9484. For active users, use the in-platform support or dispute channel where available.",
      },
      {
        q: "Where can I read the full terms and privacy information?",
        a: "Refer to the Terms of Use, Privacy Policy, relevant service agreements and any property or payment-specific terms published by House In Hands.",
      },
    ],
  },
];
