import Image from "next/image";
import Link from "next/link";

import { IconArrowRight, IconShield } from "@/components/icons";
import { Reveal } from "@/components/Reveal";

/**
 * Banner de cierre.
 *
 * Resume el compromiso del producto: la recuperación de objetos no ocurre
 * por contacto informal entre estudiantes, sino a través del punto de custodia
 * institucional. El panel oscuro cierra la narrativa con la misma paleta del
 * resto del sitio.
 */
export function ClosingBanner() {
  return (
    <section className="section bg-white" aria-labelledby="cierre-titulo">
      <div className="container-page">
        <Reveal>
          <div className="relative overflow-hidden rounded-[1.75rem] bg-forest-900">
            <div className="relative z-10 grid gap-10 px-6 py-12 sm:px-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-14 lg:py-16">
              <div>
                <p className="eyebrow text-lime-300">
                  <span className="h-px w-8 bg-lime-400" aria-hidden="true" />
                  Recuperación responsable
                </p>

                <h2
                  id="cierre-titulo"
                  className="mt-5 max-w-xl text-[1.75rem] font-semibold leading-[1.15] tracking-[-0.025em] text-white sm:text-[2.2rem]"
                >
                  Recuperar un objeto también es cuidar el campus
                </h2>

                <p className="mt-5 max-w-xl text-[15.5px] leading-[1.7] text-white/70">
                  Los objetos que se pierden y se encuentran llegan al punto de
                  custodia del campus. Allí se registran, se publican y se
                  entregan a su legítimo dueño después de la revisión del
                  personal autorizado.
                </p>

                <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Link href="/objetos" className="btn btn-accent">
                    Explorar objetos
                    <IconArrowRight className="h-4 w-4" />
                  </Link>

                  <Link
                    href="/publicar"
                    className="btn btn-ghost-dark"
                  >
                    Reportar un objeto
                  </Link>
                </div>

                <p className="mt-6 flex items-start gap-2 text-[13px] leading-relaxed text-white/60">
                  <IconShield className="mt-0.5 h-4 w-4 shrink-0 text-lime-400" />
                  <span>
                    Nunca habilitamos el intercambio directo entre estudiantes:
                    la entrega la realiza el personal autorizado.
                  </span>
                </p>
              </div>

              <div className="relative aspect-[16/11] w-full overflow-hidden rounded-[1.25rem] lg:aspect-[4/3]">
                <Image
                  src="/images/campus-banners.webp"
                  alt="Edificio del Campus Alfonso XIII de la Universidad de Cartagena"
                  fill
                  sizes="(min-width: 1024px) 30rem, 100vw"
                  className="object-cover"
                />
              </div>
            </div>

            {/* Acento de color de marca en el borde inferior del panel. */}
            <div
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 h-1 bg-lime-500"
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
