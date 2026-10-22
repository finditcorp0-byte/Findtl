import Image from "next/image";
import Link from "next/link";

import { IconArrowRight } from "@/components/icons";
import { CategoryIcon } from "@/components/illustrations";
import { Reveal } from "@/components/Reveal";
import {
  CATEGORY_IMAGES,
  CATEGORY_LABELS,
  OBJECT_CATEGORIES,
  type ObjectCategory,
} from "@/lib/demo-objects";

/**
 * Retícula de categorías.
 *
 * Cada categoría abre el catálogo con el filtro correspondiente aplicado. La
 * imagen es representativa del tipo de objeto y el contador indica cuántos
 * registros de demostración existen en esa categoría.
 */
export function CategoryGrid({ counts }: { counts: Record<ObjectCategory, number> }) {
  return (
    <section id="categorias" className="section bg-white" aria-labelledby="categorias-titulo">
      <div className="container-page">
        <Reveal>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-xl">
              <p className="eyebrow">
                <span className="h-px w-8 bg-forest-600" aria-hidden="true" />
                Explora por categoría
              </p>
              <h2
                id="categorias-titulo"
                className="mt-4 text-[1.85rem] font-semibold leading-[1.15] tracking-[-0.025em] text-ink sm:text-[2.3rem]"
              >
                Empieza por lo que buscas
              </h2>
              <p className="mt-4 text-[16px] leading-[1.7] text-muted">
                Elige una categoría y abre el catálogo con el filtro ya
                aplicado.
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

        <ul className="mt-10 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
          {OBJECT_CATEGORIES.map((category, index) => (
            <li key={category}>
              <Reveal delay={index * 50} className="h-full">
                <Link
                  href={`/objetos?categoria=${category}`}
                  className="group relative flex h-full flex-col overflow-hidden rounded-[1.25rem] border border-line bg-white transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-forest-200 hover:shadow-lift focus-visible:border-forest-400"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-canvas">
                    <Image
                      src={CATEGORY_IMAGES[category]}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 18rem, (min-width: 640px) 22rem, 45vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                    <span className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white/95 text-forest-800 shadow-soft">
                      <CategoryIcon category={category} className="h-4.5 w-4.5" />
                    </span>
                  </div>

                  <div className="flex flex-1 items-center justify-between gap-3 px-4 py-3.5">
                    <span className="text-[14px] font-semibold leading-tight tracking-[-0.01em] text-ink">
                      {CATEGORY_LABELS[category]}
                    </span>
                    <span className="shrink-0 text-[12.5px] font-medium text-muted">
                      {counts[category] ?? 0}
                    </span>
                  </div>
                </Link>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
