"use client";

import { useCallback, useMemo, useState } from "react";

import { IconClose, IconInfo, IconSearch } from "@/components/icons";
import { ObjectCard } from "@/components/ObjectCard";
import { ObjectDetailsModal } from "@/components/ObjectDetailsModal";
import { Reveal } from "@/components/Reveal";
import {
  CATEGORY_FILTERS,
  CATEGORY_LABELS,
  DEMO_OBJECTS,
  filterDemoObjects,
  type CategoryFilter,
  type DemoObject,
} from "@/lib/demo-objects";

export function ObjectExplorer() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("todos");
  const [selected, setSelected] = useState<DemoObject | null>(null);

  const results = useMemo(
    () => filterDemoObjects(DEMO_OBJECTS, query, category),
    [query, category],
  );

  const hasFilters = query.trim() !== "" || category !== "todos";

  const clearAll = useCallback(() => {
    setQuery("");
    setCategory("todos");
  }, []);

  const closeDetails = useCallback(() => setSelected(null), []);

  return (
    <section id="objetos" className="scroll-mt-24 bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        {/* Encabezado de sección ------------------------------------------ */}
        <Reveal>
          <div className="max-w-2xl">
            <p className="eyebrow">
              <span className="h-px w-8 bg-brand" aria-hidden="true" />
              Explorador de objetos
            </p>
            <h2 className="mt-4 text-[1.85rem] font-semibold leading-[1.15] tracking-[-0.025em] text-ink sm:text-[2.35rem]">
              Quizá ya está aquí
            </h2>
            <p className="mt-4 text-[16px] leading-[1.7] text-muted">
              Explora los objetos encontrados y consulta la información
              disponible.
            </p>
          </div>
        </Reveal>

        {/* Aviso de demostración ------------------------------------------ */}
        <p className="mt-8 flex items-start gap-2.5 rounded-2xl border border-line bg-canvas px-4 py-3.5 text-[13px] leading-relaxed text-muted">
          <IconInfo className="mt-0.5 h-4 w-4 shrink-0 text-brand-strong" />
          <span>
            <span className="font-semibold text-ink">Datos de demostración.</span>{" "}
            Los registros de esta sección son ficticios y sirven para mostrar
            cómo funcionará el explorador. No son reportes reales de ninguna
            institución.
          </span>
        </p>

        {/* Controles ------------------------------------------------------ */}
        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,22rem)_1fr] lg:items-center lg:gap-6">
          <div className="relative">
            <label htmlFor="buscar-objetos" className="sr-only">
              Buscar por nombre o descripción
            </label>
            <IconSearch className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-muted" />
            <input
              id="buscar-objetos"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nombre o descripción"
              className="h-13 w-full rounded-2xl border border-line bg-canvas pl-11 pr-11 text-[15px] text-ink transition-colors duration-200 placeholder:text-muted hover:border-line focus:border-brand focus:bg-white focus:outline-none focus-visible:outline-none focus:ring-4 focus:ring-brand/12"
            />
            {query !== "" && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2.5 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition-colors duration-200 hover:bg-line/60 hover:text-ink"
              >
                <IconClose className="h-4 w-4" />
                <span className="sr-only">Limpiar búsqueda</span>
              </button>
            )}
          </div>

          <div
            role="group"
            aria-label="Filtrar objetos por categoría"
            className="flex flex-wrap items-center gap-2"
          >
            {CATEGORY_FILTERS.map((key) => {
              const isActive = category === key;
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setCategory(key)}
                  className={`inline-flex h-10 items-center rounded-full border px-4 text-[13.5px] font-medium transition-[background-color,border-color,color,box-shadow] duration-200 ${
                    isActive
                      ? "border-brand-strong bg-brand-strong text-white shadow-[0_10px_20px_-14px_rgba(43,79,199,0.95)]"
                      : "border-line bg-white text-ink/80 hover:border-brand/40 hover:text-ink"
                  }`}
                >
                  {CATEGORY_LABELS[key]}
                </button>
              );
            })}

            {hasFilters && (
              <button
                type="button"
                onClick={clearAll}
                className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-[13.5px] font-medium text-muted underline decoration-line underline-offset-4 transition-colors duration-200 hover:text-brand-strong"
              >
                <IconClose className="h-3.5 w-3.5" />
                Limpiar filtros
              </button>
            )}
          </div>
        </div>

        {/* Contador de resultados ---------------------------------------- */}
        <p
          aria-live="polite"
          className="mt-5 text-[13px] font-medium text-muted"
        >
          {results.length === 1
            ? "1 objeto de demostración"
            : `${results.length} objetos de demostración`}
          {hasFilters ? " con los filtros aplicados" : ""}
        </p>

        {/* Resultados ----------------------------------------------------- */}
        {results.length > 0 ? (
          <Reveal delay={60}>
            <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((object) => (
                <li key={object.id} className="h-full">
                  <ObjectCard object={object} onSelect={setSelected} />
                </li>
              ))}
            </ul>
          </Reveal>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-line bg-canvas px-6 py-14 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-muted shadow-soft">
              <IconSearch className="h-5 w-5" />
            </span>
            <p className="mt-4 text-[15.5px] font-semibold text-ink">
              No hay objetos que coincidan con la búsqueda
            </p>
            <p className="mx-auto mt-1.5 max-w-sm text-[13.5px] leading-relaxed text-muted">
              Prueba con otro término, cambia la categoría o reinicia los
              filtros para ver todos los registros de demostración.
            </p>
            <button type="button" onClick={clearAll} className="btn btn-secondary mt-5">
              Limpiar búsqueda y filtros
            </button>
          </div>
        )}
      </div>

      <ObjectDetailsModal object={selected} onClose={closeDetails} />
    </section>
  );
}
