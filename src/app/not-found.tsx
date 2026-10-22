import Link from "next/link";

import { Footer } from "@/components/Footer";
import { IconArrowRight, IconSearch } from "@/components/icons";
import { Navbar } from "@/components/Navbar";

export default function NotFound() {
  return (
    <>
      <Navbar />

      <main id="contenido">
        <div className="container-page flex min-h-[60vh] items-center py-20">
          <div className="max-w-xl">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-forest-50 text-forest-700">
              <IconSearch className="h-5 w-5" />
            </span>

            <p className="eyebrow mt-6">
              <span className="h-px w-8 bg-forest-600" aria-hidden="true" />
              Error 404
            </p>

            <h1 className="mt-4 text-[2rem] font-semibold leading-[1.12] tracking-[-0.03em] text-ink sm:text-[2.5rem]">
              No encontramos este objeto
            </h1>

            <p className="mt-4 text-[16px] leading-[1.7] text-muted">
              Puede que el registro se haya retirado o que el enlace esté mal
              escrito. Revisa el catálogo: hay más objetos de los que crees.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/objetos" className="btn btn-primary">
                Ver el catálogo
                <IconArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/" className="btn btn-secondary">
                Ir al inicio
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
