import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import About from "@/components/About";
import Mission from "@/components/Mission";
import Vision from "@/components/Vision";

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main className="pt-20">
        <About />
        <Mission />
        <Vision />
      </main>
      <Footer />
    </>
  );
}
