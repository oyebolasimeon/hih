import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="pt-28 pb-16 sm:pb-24 bg-white min-h-screen">
        <div className="max-w-3xl mx-auto px-5 sm:px-6 lg:px-8">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
            Privacy Policy
          </h1>
          <p className="mt-4 text-muted text-sm">Last updated: 2026</p>
          <div className="mt-8 space-y-4 text-sm text-muted leading-relaxed">
            <p>
              House In Hand collects account, profile, KYC, listing, and usage
              data needed to operate a trusted rental platform in Nigeria.
            </p>
            <p>
              We use this information to verify users and listings, process
              applications and agreements, improve the product, and meet legal
              obligations. We do not sell personal data.
            </p>
            <p>
              A complete privacy notice will ship with MVP. Contact
              hello@houseinhand.com for privacy requests.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
