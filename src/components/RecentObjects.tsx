import Link from "next/link";

import { IconArrowRight } from "@/components/icons";
import { ObjectCard } from "@/components/ObjectCard";
import { Reveal } from "@/components/Reveal";
import type { PublicObject } from "@/lib/supabase/queries";

/**
 * Objetos recientes.
 *
 * Muestra los registros más recientes publicados y ofrece la entrada
 * al catálogo completo. Los datos vienen ordenados por fecha de publicación
 * (más recientes primero).
 */
export function RecentObjects({ objects = [] }: { objects?: PublicObject[] }) {
  return (
    <section
      id="objetos-recientes"
      className="section bg-canvas"
      aria-labelledby="recientes-titulo"
    >
      <div className="container-page">
        <Reveal>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-xl">
              <p className="eyebrow">
                <span className="h-px w-8 bg-forest-600" aria-hidden="true" />
                Registros recientes
              </p>
              <h2
                id="recientes-titulo"
                className="mt-4 text-[1.85rem] font-semibold leading-[1.15] tracking-[-0.025em] text-ink sm:text-[2.3rem]"
              >
                Lo último publicado en el campus
              </h2>
              <p className="mt-4 text-[16px] leading-[1.7] text-muted">
                Objetos publicados oficialmente. Cada registro se revisa en el
                punto de custodia institucional antes de aparecer aquí.
              </p>
            </div>

            <Link
              href="/objetos"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl px-1 py-2 text-[14.5px] font-semibold text-forest-700 transition-colors duration-200 hover:text-forest-900"
            >
              Ver todos los objetos
              <IconArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Reveal>

        {objects.length > 0 ? (
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {objects.map((object, index) => (
              <li key={object.id}>
                <Reveal delay={index * 60} className="h-full">
                  <ObjectCard object={object} />
                </Reveal>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-10 text-center text-muted">
            <p className="text-[15px]">No hay objetos publicados recientemente.</p>
            <p className="mt-2 text-[13px]">
              Cuando se publiquen, aparecerán aquí automáticamente.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}