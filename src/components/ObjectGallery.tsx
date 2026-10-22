"use client";

import { useState } from "react";
import Image from "next/image";

/**
 * Galería del objeto.
 *
 * Muestra una fotografía principal y, cuando hay más de una, un grupo de
 * miniaturas. El botón activo se marca con `aria-current` para que el estado
 * sea percebido también sin color.
 */
export function ObjectGallery({
  images,
  title,
}: {
  images: string[];
  title: string;
}) {
  const [active, setActive] = useState(0);
  const current = images[active];

  if (!current) {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center rounded-[1.25rem] border border-dashed border-line-strong bg-canvas text-[14px] text-muted">
        Sin fotografía
      </div>
    );
  }

  return (
    <div>
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[1.25rem] bg-canvas">
        <Image
          src={current}
          alt={`Fotografía de demostración de ${title}`}
          fill
          priority
          sizes="(min-width: 1024px) 40rem, 100vw"
          className="object-cover"
        />
      </div>

      {images.length > 1 && (
        <ul className="mt-3 flex flex-wrap gap-3">
          {images.map((source, index) => {
            const isActive = index === active;

            return (
              <li key={source}>
                <button
                  type="button"
                  onClick={() => setActive(index)}
                  aria-current={isActive ? "true" : undefined}
                  className={`block overflow-hidden rounded-xl border-2 transition-colors duration-200 ${
                    isActive
                      ? "border-forest-700"
                      : "border-transparent hover:border-forest-200"
                  }`}
                >
                  <span className="sr-only">
                    Ver fotografía {index + 1} de {images.length}: {title}
                  </span>
                  <Image
                    src={source}
                    alt=""
                    width={96}
                    height={72}
                    className="h-[4.5rem] w-24 object-cover"
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
