import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Mission from "@/components/Mission";
import Vision from "@/components/Vision";
import WhyChooseUs from "@/components/WhyChooseUs";
import Excellence from "@/components/Excellence";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <About />
        <Mission />
        <Vision />
        <WhyChooseUs />
        <Excellence />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
