import { AboutSection } from "@/components/AboutSection";
import { CategoryGrid } from "@/components/CategoryGrid";
import { ClosingBanner } from "@/components/ClosingBanner";
import { FAQ } from "@/components/FAQ";
import { FinalCTA } from "@/components/FinalCTA";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { Navbar } from "@/components/Navbar";
import { ObjectCategory } from "@/lib/demo-objects";
import { QuickBenefits } from "@/components/QuickBenefits";
import { RecentObjects } from "@/components/RecentObjects";
import { SecuritySection } from "@/components/SecuritySection";
import { getCategoriesWithCounts, getRecentObjects } from "@/lib/supabase/queries";

export default async function Home() {
  const [recentObjects, categoriesWithCountsArray] = await Promise.all([
    getRecentObjects(6),
    getCategoriesWithCounts(),
  ]);

  // Convertir array a Record<ObjectCategory, number> para CategoryGrid
  const categoryCountsRecord: Record<ObjectCategory, number> = {
    electronicos: 0,
    documentos: 0,
    llaves: 0,
    bolsos: 0,
    ropa: 0,
    accesorios: 0,
    libros: 0,
    otros: 0,
  };

  categoriesWithCountsArray.forEach((cat) => {
    if (cat.slug in categoryCountsRecord) {
      categoryCountsRecord[cat.slug as ObjectCategory] = cat.count;
    }
  });

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
        <CategoryGrid counts={categoryCountsRecord} />
        <RecentObjects objects={recentObjects} />
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