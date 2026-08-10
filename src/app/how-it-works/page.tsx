import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";

export default function HowItWorksPage() {
  return (
    <>
      <Navbar />
      <main className="pt-28 pb-16 sm:pb-24 bg-white min-h-screen">
        <div className="max-w-3xl mx-auto px-5 sm:px-6 lg:px-8">
          <p className="text-brand font-medium text-sm uppercase tracking-wider">
            How it works
          </p>
          <h1 className="mt-3 font-display text-3xl sm:text-4xl font-bold text-foreground">
            From search to tenancy in a few steps
          </h1>
          <p className="mt-4 text-muted leading-relaxed">
            House In Hand helps students, tenants, landlords, and estate managers
            handle housing in one place.
          </p>
          <ol className="mt-10 space-y-6">
            {[
              {
                title: "Create an account & profile",
                body: "Sign up, then choose Student, Tenant, Landlord, or Estate Manager.",
              },
              {
                title: "Complete KYC when asked",
                body: "Verified profiles unlock applications, listings, and trust on both sides.",
              },
              {
                title: "Search or list",
                body: "Find homes in search, or publish listings for review before they go live.",
              },
              {
                title: "Apply, agree, pay",
                body: "Manage applications, digital agreements, and rent payments in the app.",
              },
            ].map((step, i) => (
              <li key={step.title} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-foreground text-sm font-semibold">
                  {i + 1}
                </span>
                <div>
                  <h2 className="font-semibold text-foreground">{step.title}</h2>
                  <p className="mt-1 text-sm text-muted">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/register" className="app-btn app-btn-primary">
              Get started
            </Link>
            <Link href="/listings" className="app-btn app-btn-secondary">
              Browse listings
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
