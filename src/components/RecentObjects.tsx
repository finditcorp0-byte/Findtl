import Link from "next/link";

import { IconArrowRight } from "@/components/icons";
import { ObjectCard } from "@/components/ObjectCard";
import { Reveal } from "@/components/Reveal";
import { DEMO_OBJECTS, type DemoObject } from "@/lib/demo-objects";

/**
 * Objetos recientes.
 *
 * Muestra los registros más recientes de la demostración y ofrece la entrada
 * al catálogo completo. Los datos se ordenan por antigüedad para que la
 * lista sea estable aunque se añadan objetos nuevos.
 */
export function RecentObjects({ objects = DEMO_OBJECTS }: { objects?: DemoObject[] }) {
  const recent = [...objects].sort((a, b) => a.daysAgo - b.daysAgo).slice(0, 6);

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
                Reportes de demostración cargados por estudiantes y personal.
                Cada registro se revisa en el punto de custodia institucional.
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

        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {recent.map((object, index) => (
            <li key={object.id}>
              <Reveal delay={index * 60} className="h-full">
                <ObjectCard object={object} />
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
