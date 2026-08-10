import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="pt-28 pb-16 sm:pb-24 bg-white min-h-screen">
        <div className="max-w-3xl mx-auto px-5 sm:px-6 lg:px-8 prose-sm">
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
            Terms of Service
          </h1>
          <p className="mt-4 text-muted text-sm">Last updated: 2026</p>
          <div className="mt-8 space-y-4 text-sm text-muted leading-relaxed">
            <p>
              These Terms of Service govern your use of House In Hand, a property
              rental and housing management platform operated in Nigeria.
            </p>
            <p>
              By creating an account or using the service, you agree to use the
              platform lawfully, provide accurate profile and listing
              information, and respect KYC and verification requirements.
            </p>
            <p>
              Full commercial terms will be published with MVP launch. For
              questions, contact hello@houseinhand.com.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
