import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function AboutPage() {
  return (
    <div className="site-page">
      <Navbar />
      <main className="pt-28">
        <section className="bg-sand">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-6 lg:grid lg:grid-cols-12 lg:gap-16 lg:px-8 lg:py-28">
            <div className="lg:col-span-7">
              <p className="site-kicker">About</p>
              <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight text-navy sm:text-5xl lg:text-6xl">
                Homes deserve better systems
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-muted max-w-2xl">
                House In Hand exists to replace scattered chats, cash envelopes,
                and paper trails with one trusted housing workflow for Nigeria.
              </p>
            </div>
            <div className="mt-12 lg:col-span-5 lg:mt-0">
              <div className="aspect-[4/5] overflow-hidden bg-navy">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/home-interior.jpg"
                  alt="A considered living space"
                  className="h-full w-full object-cover opacity-90"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="site-section bg-navy text-sand">
          <div className="mx-auto max-w-3xl px-5 sm:px-6 lg:px-8">
            <h2 className="font-display text-3xl font-semibold sm:text-4xl">
              Our colour of confidence
            </h2>
            <ul className="mt-10 space-y-8">
              <li>
                <p className="text-teal font-semibold">Deep navy</p>
                <p className="mt-2 text-sand/70 leading-relaxed">
                  Trust, stability, and financial clarity — the tone of verified
                  identity and secure agreements.
                </p>
              </li>
              <li>
                <p className="text-teal font-semibold">Teal</p>
                <p className="mt-2 text-sand/70 leading-relaxed">
                  Proptech energy — modern tools for search, KYC, and rent that
                  still feel human.
                </p>
              </li>
              <li>
                <p className="text-teal font-semibold">Warm sand</p>
                <p className="mt-2 text-sand/70 leading-relaxed">
                  The feel of home — warmth against the seriousness of contracts
                  and cashflow.
                </p>
              </li>
            </ul>
            <Link
              href="/register"
              className="site-btn site-btn-teal mt-12 inline-flex"
            >
              Join the platform
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
