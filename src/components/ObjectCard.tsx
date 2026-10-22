import Image from "next/image";
import Link from "next/link";

import { IconArrowRight, IconClock, IconPin } from "@/components/icons";
import {
  CATEGORY_LABELS,
  KIND_LABELS,
  coverImage,
  formatAge,
  type DemoObject,
} from "@/lib/demo-objects";

/**
 * Tarjeta de un objeto.
 *
 * El título es el enlace real (técnica del enlace extendido): el área
 * sensible es toda la tarjeta, pero el nombre accesible sigue siendo el del
 * objeto y no un botón genérico.
 */
export function ObjectCard({ object }: { object: DemoObject }) {
  const cover = coverImage(object);
  const isPerdido = object.kind === "perdido";

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[1.25rem] border border-line bg-white transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-forest-200 hover:shadow-lift focus-within:border-forest-300">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-canvas">
        {cover ? (
          <Image
            src={cover}
            alt={`Fotografía de demostración de ${object.title}`}
            fill
            sizes="(min-width: 1024px) 22rem, (min-width: 640px) 20rem, 90vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-[13px] text-muted">
            Sin fotografía
          </span>
        )}

        <span
          className={`absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${
            isPerdido ? "badge-perdido" : "badge-encontrado"
          }`}
        >
          <span
            aria-hidden="true"
            className={`h-1.5 w-1.5 rounded-full ${
              isPerdido ? "bg-lost-text" : "bg-found-text"
            }`}
          />
          {KIND_LABELS[object.kind]}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-forest-600">
          {CATEGORY_LABELS[object.category]}
        </p>

        <h3 className="mt-1.5 text-[16px] font-semibold leading-snug tracking-[-0.015em] text-ink">
          <Link
            href={`/objetos/${object.id}`}
            className="transition-colors duration-200 after:absolute after:inset-0 after:content-[''] hover:text-forest-700"
          >
            {object.title}
          </Link>
        </h3>

        <p className="mt-2 flex items-start gap-1.5 text-[13px] leading-snug text-muted">
          <IconPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-forest-600" />
          <span>
            {object.zone} · {object.location}
          </span>
        </p>

        <p className="mt-2 flex items-center gap-1.5 text-[12.5px] text-muted">
          <IconClock className="h-3.5 w-3.5 shrink-0 text-forest-600" />
          {formatAge(object.daysAgo)}
        </p>

        <p className="mt-auto flex items-center gap-1.5 pt-4 text-[13.5px] font-semibold text-forest-700">
          Ver detalle
          <IconArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
        </p>
      </div>
    </article>
  );
}
