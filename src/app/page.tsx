import { AboutSection } from "@/components/AboutSection";
import { CategoryGrid } from "@/components/CategoryGrid";
import { ClosingBanner } from "@/components/ClosingBanner";
import { FAQ } from "@/components/FAQ";
import { FinalCTA } from "@/components/FinalCTA";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { Navbar } from "@/components/Navbar";
import { QuickBenefits } from "@/components/QuickBenefits";
import { RecentObjects } from "@/components/RecentObjects";
import { SecuritySection } from "@/components/SecuritySection";
import { categoryCounts } from "@/lib/demo-objects";

export default function Home() {
  return (
    <>
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[70] focus:rounded-xl focus:bg-forest-800 focus:px-4 focus:py-2.5 focus:text-[13.5px] focus:font-medium focus:text-white"
      >
        Ir al contenido principal
      </a>

      <Navbar />

      <main id="contenido">
        <Hero />
        <QuickBenefits />
        <CategoryGrid counts={categoryCounts()} />
        <RecentObjects />
        <ClosingBanner />
        <AboutSection />
        <HowItWorks />
        <SecuritySection />
        <FAQ />
        <FinalCTA />
      </main>

      <Footer />
    </>
  );
}
