import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WaitlistClient from "@/components/WaitlistClient";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Waitlist — Get notified when House In Hands launches",
  description:
    "Join the House In Hands waitlist with your email and phone number. Be first to know when we officially launch trusted house hunting and property management in Nigeria.",
  path: "/waitlist",
  keywords: [
    "House In Hands waitlist",
    "property platform Nigeria launch",
    "house hunting waitlist",
  ],
});

const perks = [
  {
    title: "Launch alerts",
    body: "Email and SMS-ready contact so you hear first when we go live.",
  },
  {
    title: "Early access",
    body: "Priority onboarding for tenants, landlords and property managers.",
  },
  {
    title: "One trusted place",
    body: "Find, agree, pay and manage homes — Property. In Your Hands.",
  },
];

export default function WaitlistPage() {
  return (
    <div className="site-page">
      <Navbar />
      <main>
        <section className="relative overflow-hidden pt-28 pb-16 sm:pt-32 sm:pb-24">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(0,133,133,0.18),_transparent_55%),radial-gradient(ellipse_at_bottom_left,_rgba(11,31,58,0.08),_transparent_50%)]"
            aria-hidden
          />
          <div className="relative mx-auto grid max-w-7xl gap-12 px-5 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:items-center">
            <div>
              <p className="site-kicker">Coming soon</p>
              <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-navy sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
                Be first when House In Hands launches
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
                We&apos;re building trusted house hunting and property management
                for Nigeria. Leave your email and phone — we&apos;ll notify you
                the moment we officially launch.
              </p>

              <ul className="mt-10 space-y-5">
                {perks.map((perk) => (
                  <li key={perk.title} className="flex gap-3">
                    <span
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-teal"
                      aria-hidden
                    />
                    <div>
                      <p className="font-semibold text-navy">{perk.title}</p>
                      <p className="mt-0.5 text-sm text-muted leading-relaxed">
                        {perk.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>

              <p className="mt-8 text-sm text-muted">
                Already exploring?{" "}
                <Link
                  href="/listings"
                  className="font-semibold text-teal-dark hover:underline"
                >
                  Browse listings
                </Link>{" "}
                or{" "}
                <Link
                  href="/how-it-works"
                  className="font-semibold text-teal-dark hover:underline"
                >
                  see how it works
                </Link>
                .
              </p>
            </div>

            <WaitlistClient />
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
