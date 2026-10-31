import { DEFAULT_PLATFORM_FEES } from "@/lib/platform-fees";
import { PM_SERVICE_LEVELS } from "@/lib/property-management-model";

/** Public pricing copy — aligned with platform fee defaults + PM model. */

export const PRICING_HERO = {
  kicker: "Pricing",
  title: "Clear rates. No agent commission surprises.",
  body: "Tenants and students start free. Landlords and managers choose software, assisted support or full management — and every applicable fee is shown before you commit.",
};

export const PRICING_TENANT = {
  title: "For tenants & students",
  priceLabel: "Free to start",
  points: [
    "Create an account and search verified homes at no charge",
    "See rent and disclosed charges before you apply",
    "No traditional agent commission on the direct rental workflow",
    "Agreement / legal fee only when you proceed to a digital lease — shown upfront",
  ],
};

export const PRICING_LANDLORD_SOFTWARE = {
  title: "For landlords — software",
  priceLabel: "Transparent transaction fees",
  points: [
    `Default agreement & legal fee: ${DEFAULT_PLATFORM_FEES.agreementFeePercent}% of annual rent when House In Hands handles legal`,
    `If you use your own legal partner: platform fee from ${DEFAULT_PLATFORM_FEES.platformFeeMinPercent}% (shown at checkout)`,
    "List, verify, collect rent, track occupancy and maintenance in one workspace",
    "Fees are configurable by admin and always disclosed before payment",
  ],
};

export const HOW_PRICING_WORKS = [
  {
    n: "01",
    title: "Search is free",
    body: "Anyone can create an account, complete verification and browse listings without a subscription.",
  },
  {
    n: "02",
    title: "Fees appear before you commit",
    body: "When you apply, agree or pay, the platform shows rent, agreement/legal fees and any platform fee separately — no hidden agent mark-ups.",
  },
  {
    n: "03",
    title: "Choose how legal is handled",
    body: "Landlords can let House In Hands prepare the agreement (agreement fee to HIH) or use their own legal partner (a small platform fee may apply).",
  },
  {
    n: "04",
    title: "Scale with management levels",
    body: "Move from self-serve software to assisted or fully managed packages as your portfolio grows — software subscriptions, service fees and management packages.",
  },
];

export const PRICING_MANAGEMENT_TIERS = PM_SERVICE_LEVELS.map((tier, i) => ({
  ...tier,
  badge: i === 0 ? "Software" : i === 1 ? "Support" : "Full service",
  highlights:
    i === 0
      ? [
          "Listings, tenants, rent & maintenance tools",
          "Digital agreements and payment workflows",
          "Portfolio dashboard and records",
        ]
      : i === 1
        ? [
            "Everything in Self-Managed",
            "Selected operational support",
            "Service-provider coordination help",
          ]
        : [
            "Delegated day-to-day operations",
            "HIH-managed staff / partners",
            "Formal property-management arrangement",
          ],
}));

export const PRICING_EXAMPLE = {
  title: "Example — HIH handles legal",
  body: `On a ₦3,500,000 yearly rent, the default agreement & legal fee is about ₦${(
    (3_500_000 * DEFAULT_PLATFORM_FEES.agreementFeePercent) /
    100
  ).toLocaleString("en-NG")} (${DEFAULT_PLATFORM_FEES.agreementFeePercent}%). Exact amounts are calculated at checkout from live settings.`,
};

export const PRICING_NOTES = [
  "Registration for tenants and students is intended to be free.",
  "Applicable fees are disclosed before payment or commitment.",
  "Third-party payment processor charges may apply.",
  "Managed-service and subscription rates for larger portfolios are confirmed during onboarding.",
];
