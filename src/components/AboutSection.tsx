import Image from "next/image";
import Link from "next/link";

import { IconArrowRight, IconBuilding, IconLayers, IconShield } from "@/components/icons";
import { Reveal } from "@/components/Reveal";

const PRINCIPLES = [
  {
    title: "Institucional, no informal",
    description:
      "Cada registro pasa por el punto de custodia del campus antes de publicarse. Nadie entrega un objeto desconocido a un desconocido.",
    icon: IconShield,
  },
  {
    title: "Ordenado, no disperso",
    description:
      "Los objetos se clasifican por categoría, zona y fecha para que la búsqueda termine en segundos, no en semanas de publicaciones.",
    icon: IconLayers,
  },
  {
    title: "Pensado para el campus",
    description:
      "Nace en Cartagena y se adapta a las reglas de cada institución: el flujo se define con el personal autorizado de cada sede.",
    icon: IconBuilding,
  },
];

/**
 * Sección "Sobre nosotros".
 *
 * Explica qué es FindIt Campus y para qué existe, con contenido propio y no
 * un párrafo genérico: es el ancla a la que apunta el enlace del menú.
 */
export function AboutSection() {
  return (
    <section
      id="sobre-nosotros"
      className="section bg-white"
      aria-labelledby="sobre-titulo"
    >
      <div className="container-page">
        <div className="grid items-center gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
          <Reveal>
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[1.75rem] bg-canvas shadow-soft">
              <Image
                src="/images/campus-biblioteca.webp"
                alt="Biblioteca del campus con estantes y mesas de estudio"
                fill
                sizes="(min-width: 1024px) 32rem, 100vw"
                className="object-cover"
              />
            </div>
          </Reveal>

          <Reveal delay={80}>
            <div>
              <p className="eyebrow">
                <span className="h-px w-8 bg-forest-600" aria-hidden="true" />
                Sobre nosotros
              </p>

              <h2
                id="sobre-titulo"
                className="mt-4 text-[1.85rem] font-semibold leading-[1.15] tracking-[-0.025em] text-ink sm:text-[2.3rem]"
              >
                Un campus pierde objetos todos los días. Encontrarlos no
                debería ser el problema
              </h2>

              <p className="mt-5 text-[16px] leading-[1.75] text-muted">
                FindIt Campus es la herramienta con la que una institución
                ordena lo que se pierde: publica los objetos que llegan a
                recepción, permite reportar los que desaparecen y facilita que
                el personal autorizado los devuelva a quien corresponde.
              </p>

              <ul className="mt-8 space-y-6">
                {PRINCIPLES.map((principle) => {
                  const Icon = principle.icon;

                  return (
                    <li key={principle.title} className="flex gap-4">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-forest-50 text-forest-700">
                        <Icon className="h-4.5 w-4.5" />
                      </span>

                      <div>
                        <h3 className="text-[15.5px] font-semibold tracking-[-0.01em] text-ink">
                          {principle.title}
                        </h3>
                        <p className="mt-1.5 text-[14px] leading-[1.7] text-muted">
                          {principle.description}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-9">
                <Link
                  href="/#como-funciona"
                  className="inline-flex items-center gap-1.5 rounded-xl px-1 py-2 text-[14.5px] font-semibold text-forest-700 transition-colors duration-200 hover:text-forest-900"
                >
                  Ver cómo funciona el proceso
                  <IconArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
