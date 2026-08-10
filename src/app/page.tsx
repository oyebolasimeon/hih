import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import HowItWorksHome from "@/components/HowItWorksHome";
import AudienceStrip from "@/components/AudienceStrip";
import HomeStory from "@/components/HomeStory";
import ClosingCta from "@/components/ClosingCta";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="site-page">
      <Navbar />
      <main>
        <Hero />
        <HowItWorksHome />
        <AudienceStrip />
        <HomeStory />
        <ClosingCta />
      </main>
      <Footer />
    </div>
  );
}
