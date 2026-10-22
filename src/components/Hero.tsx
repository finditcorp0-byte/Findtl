import Image from "next/image";
import Link from "next/link";

import { HeroSearch } from "@/components/HeroSearch";
import { IconArrowRight, IconPin, IconShield } from "@/components/icons";

/**
 * Hero de la página de inicio.
 *
 * Composición en dos bloques: el mensaje y el buscador a la izquierda, la
 * fotografía del campus a la derecha. El fondo sigue siendo blanco para que
 * la fotografía sea el único elemento de peso visual del primer pantallazo.
 */
export function Hero() {
  return (
    <section id="inicio" className="relative overflow-x-clip bg-white">
      <div className="container-page">
        <div className="grid items-center gap-12 py-14 sm:py-16 lg:grid-cols-[1.02fr_0.98fr] lg:gap-16 lg:py-20">
          {/* Texto ---------------------------------------------------------- */}
          <div>
            <p className="hero-in hero-in-1 eyebrow">
              <span className="h-px w-8 bg-forest-600" aria-hidden="true" />
              Objetos perdidos en tu campus
            </p>

            <h1 className="hero-in hero-in-2 mt-5 text-[2.25rem] font-semibold leading-[1.08] tracking-[-0.035em] text-ink sm:text-[3rem] lg:text-[3.4rem]">
              Lo que pierdes,
              <br />
              <span className="text-forest-700">puede volver a ti.</span>
            </h1>

            <p className="hero-in hero-in-3 mt-6 max-w-xl text-[16.5px] leading-[1.7] text-muted sm:text-[17.5px]">
              Encuentra o reporta objetos perdidos en tu campus de forma rápida,
              segura y gratuita, con la custodia del personal autorizado de la
              institución.
            </p>

            <div className="hero-in hero-in-4">
              <HeroSearch />
            </div>

            <div className="hero-in hero-in-5 mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
              <p className="flex items-center gap-2 text-[13.5px] font-medium text-muted">
                <IconShield className="h-4 w-4 shrink-0 text-forest-600" />
                Entrega desde el punto de custodia
              </p>
              <p className="flex items-center gap-2 text-[13.5px] font-medium text-muted">
                <IconPin className="h-4 w-4 shrink-0 text-forest-600" />
                Sin intercambio directo entre estudiantes
              </p>
            </div>

            <div className="hero-in hero-in-5 mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/publicar" className="btn btn-secondary">
                Reportar un objeto
              </Link>
              <Link
                href="/objetos"
                className="inline-flex items-center gap-1.5 rounded-xl px-1 py-2 text-[14.5px] font-semibold text-forest-700 transition-colors duration-200 hover:text-forest-900"
              >
                Explorar el catálogo
                <IconArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Fotografía ----------------------------------------------------- */}
          <div className="hero-in hero-in-4 relative">
            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[1.75rem] bg-canvas shadow-lift">
              <Image
                src="/images/campus-hero.webp"
                alt="Edificio del Campus de Alfonso XIII de la Universidad de Cartagena al atardecer"
                fill
                priority
                sizes="(min-width: 1024px) 46rem, 100vw"
                className="object-cover"
              />
            </div>

            {/* Ficha de contexto: sitúa la foto sin competir con el titular. */}
            <div className="absolute -bottom-5 left-4 flex items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3 shadow-lift sm:left-6">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-lime-200 text-forest-800">
                <IconPin className="h-4.5 w-4.5" />
              </span>
              <span className="text-left leading-tight">
                <span className="block text-[13px] font-semibold text-ink">
                  Cartagena, Colombia
                </span>
                <span className="block text-[12px] text-muted">
                  Primer campus de demostración
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
