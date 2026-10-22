"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { EmptyState } from "@/components/EmptyState";
import { IconRotateCcw, IconSearch } from "@/components/icons";
import { ObjectFilters } from "@/components/ObjectFilters";
import { ObjectGrid } from "@/components/ObjectGrid";
import {
  activeFilterLabels,
  countActiveFilters,
  filterDemoObjects,
  parseCampusFilter,
  parseCategoryFilter,
  parsePeriodFilter,
  parseTypeFilter,
  parseZoneFilter,
  type DemoObject,
  type ObjectFilters as CatalogFilters,
} from "@/lib/demo-objects";

/**
 * Catálogo de objetos.
 *
 * Los filtros viven en la URL: así el resultado se puede compartir, recargar
 * o abrir con un enlace directo. El componente lee los parámetros, calcula
 * el subconjunto de objetos y los escribe de vuelta con `replace` para no
 * llenar el historial del navegador.
 */
export function CatalogView({ objects }: { objects: DemoObject[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters: CatalogFilters = useMemo(
    () => ({
      query: searchParams.get("q") ?? "",
      type: parseTypeFilter(searchParams.get("tipo")),
      category: parseCategoryFilter(searchParams.get("categoria")),
      zone: parseZoneFilter(searchParams.get("zona")),
      campus: parseCampusFilter(searchParams.get("campus")),
      period: parsePeriodFilter(searchParams.get("fecha")),
    }),
    [searchParams],
  );

  const [query, setQuery] = useState(filters.query);
  const [syncedQuery, setSyncedQuery] = useState(filters.query);

  // Si la URL cambia desde fuera (por ejemplo, al limpiar los filtros), el
  // campo se ajusta durante el render, que es el patrón que recomienda React
  // para sincronizar estado con un valor externo.
  if (syncedQuery !== filters.query) {
    setSyncedQuery(filters.query);
    setQuery(filters.query);
  }

  const applyParams = useCallback(
    (changes: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(changes)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }

      const search = params.toString();
      router.replace(search === "" ? pathname : `${pathname}?${search}`, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  // La escritura del texto se retrasa para no generar una entrada por tecla.
  useEffect(() => {
    if (query.trim() === filters.query.trim()) return;

    const timer = window.setTimeout(() => {
      applyParams({ q: query.trim() });
    }, 300);

    return () => window.clearTimeout(timer);
  }, [applyParams, filters.query, query]);

  const handleFilterChange = useCallback(
    (patch: Partial<CatalogFilters>) => {
      applyParams({
        tipo: patch.type && patch.type !== "todos" ? patch.type : null,
        categoria:
          patch.category && patch.category !== "todas" ? patch.category : null,
        zona: patch.zone && patch.zone !== "todas" ? patch.zone : null,
        campus:
          patch.campus && patch.campus !== "todas" ? patch.campus : null,
        fecha: patch.period && patch.period !== "todos" ? patch.period : null,
      });
    },
    [applyParams],
  );

  const clearAll = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  const results = useMemo(
    () => filterDemoObjects(objects, filters),
    [objects, filters],
  );

  const activeCount = countActiveFilters(filters);
  const labels = activeFilterLabels(filters);

  return (
    <div className="container-page pb-20 pt-10 sm:pt-14">
      <header className="max-w-2xl">
        <p className="eyebrow">
          <span className="h-px w-8 bg-forest-600" aria-hidden="true" />
          Catálogo
        </p>

        <h1 className="mt-4 text-[2rem] font-semibold leading-[1.12] tracking-[-0.03em] text-ink sm:text-[2.7rem]">
          Objetos perdidos y encontrados
        </h1>

        <p className="mt-4 text-[16px] leading-[1.7] text-muted">
          Registros de demostración del campus. Filtra por tipo, categoría, zona
          o fecha para acotar la búsqueda.
        </p>

        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            applyParams({ q: query.trim() });
          }}
          className="mt-8 flex items-center gap-2 rounded-[1.25rem] border border-line bg-white p-2 shadow-soft"
        >
          <div className="relative flex-1">
            <label htmlFor="busqueda-catalogo" className="sr-only">
              Buscar objetos
            </label>
            <IconSearch
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-forest-600"
            />
            <input
              id="busqueda-catalogo"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Busca por nombre, descripción o ubicación"
              className="h-12 w-full rounded-[1rem] bg-transparent pl-11 pr-4 text-[15px] text-ink transition-colors duration-200 placeholder:text-muted hover:bg-canvas focus:bg-canvas focus:outline-none focus-visible:outline-none"
            />
          </div>

          <button type="submit" className="btn btn-primary w-full sm:w-auto">
            Buscar
          </button>
        </form>
      </header>

      <div className="mt-10 grid gap-8 lg:grid-cols-[17.5rem_1fr] lg:gap-10">
        <ObjectFilters
          filters={filters}
          onChange={handleFilterChange}
          onClear={clearAll}
          activeCount={activeCount}
        />

        <section aria-label="Resultados de la búsqueda">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
            <p
              aria-live="polite"
              className="text-[14px] font-medium text-ink"
            >
              {results.length === 1
                ? "1 objeto encontrado"
                : `${results.length} objetos encontrados`}
            </p>

            {activeCount > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="inline-flex items-center gap-1.5 rounded-lg px-1 py-1 text-[13.5px] font-semibold text-forest-700 transition-colors duration-200 hover:text-forest-900"
              >
                <IconRotateCcw className="h-3.5 w-3.5" />
                Limpiar filtros ({activeCount})
              </button>
            )}
          </div>

          {labels.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2">
              {labels.map((label) => (
                <li
                  key={label}
                  className="rounded-full border border-line bg-white px-3 py-1 text-[12.5px] font-medium text-muted"
                >
                  {label}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6">
            {results.length > 0 ? (
              <ObjectGrid objects={results} />
            ) : (
              <EmptyState hasFilters={activeCount > 0} onClear={clearAll} />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
