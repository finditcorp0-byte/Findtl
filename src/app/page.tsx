import { FAQ } from "@/components/FAQ";
import { FinalCTA } from "@/components/FinalCTA";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { Navbar } from "@/components/Navbar";
import { ObjectExplorer } from "@/components/ObjectExplorer";
import { SecuritySection } from "@/components/SecuritySection";

export default function Home() {
  return (
    <>
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[70] focus:rounded-xl focus:bg-night focus:px-4 focus:py-2.5 focus:text-[13.5px] focus:font-medium focus:text-white"
      >
        Ir al contenido principal
      </a>

      <Navbar />

      <main id="contenido">
        <Hero />
        <ObjectExplorer />
        <HowItWorks />
        <SecuritySection />
        <FAQ />
        <FinalCTA />
      </main>

      <Footer />
    </>
  );
}
