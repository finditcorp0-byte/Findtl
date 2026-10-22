import type { Metadata } from "next";
import { Suspense } from "react";

import { CatalogView } from "@/components/CatalogView";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";
import { DEMO_OBJECTS } from "@/lib/demo-objects";

export const metadata: Metadata = {
  title: "Catálogo de objetos",
  description:
    "Explora los objetos perdidos y encontrados del campus. Filtra por tipo, categoría, zona, institución y fecha de publicación.",
  alternates: { canonical: "/objetos" },
  openGraph: {
    title: "Catálogo de objetos | FindIt Campus",
    description:
      "Explora los objetos perdidos y encontrados del campus. Filtra por tipo, categoría, zona, institución y fecha de publicación.",
    url: "/objetos",
    type: "website",
  },
};

/** Marcador de carga para la lectura de los filtros desde la URL. */
function CatalogSkeleton() {
  return (
    <div className="container-page pb-20 pt-10 sm:pt-14" aria-hidden="true">
      <div className="max-w-2xl">
        <div className="h-3 w-32 rounded-full bg-canvas-deep" />
        <div className="mt-5 h-9 w-3/4 rounded-xl bg-canvas-deep" />
        <div className="mt-4 h-4 w-full rounded-full bg-canvas-deep" />
        <div className="mt-8 h-16 w-full rounded-[1.25rem] bg-canvas-deep" />
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[17.5rem_1fr] lg:gap-10">
        <div className="hidden h-96 rounded-[1.25rem] bg-canvas-deep lg:block" />
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className="h-72 rounded-[1.25rem] bg-canvas-deep"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ObjetosPage() {
  return (
    <>
      <Navbar />

      <main id="contenido">
        <Suspense fallback={<CatalogSkeleton />}>
          <CatalogView objects={DEMO_OBJECTS} />
        </Suspense>
      </main>

      <Footer />
    </>
  );
}
