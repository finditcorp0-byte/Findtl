"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { CampusPicker } from "@/components/CampusPicker";
import { IconSearch } from "@/components/icons";
import { DEFAULT_CAMPUS } from "@/lib/campuses";

/**
 * Buscador del titular.
 *
 * Escribe la consulta en la URL del catálogo, de modo que el resultado de la
 * búsqueda queda reflejado en la dirección y se puede compartir o recargar.
 */
export function HeroSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [campus, setCampus] = useState(DEFAULT_CAMPUS.id);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const params = new URLSearchParams();
    const term = query.trim();
    if (term !== "") params.set("q", term);
    if (campus !== "") params.set("campus", campus);

    const search = params.toString();
    router.push(search === "" ? "/objetos" : `/objetos?${search}`);
  };

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      className="mt-8 rounded-[1.5rem] border border-line bg-white p-2 shadow-soft sm:flex sm:items-center sm:gap-2"
    >
      <div className="relative flex-1">
        <label htmlFor="busqueda-hero" className="sr-only">
          Buscar objetos perdidos o encontrados
        </label>
        <IconSearch
          aria-hidden="true"
          className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-forest-600"
        />
        <input
          id="busqueda-hero"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Busca un objeto, una zona o un edificio"
          className="h-12 w-full rounded-[1.1rem] bg-transparent pl-11 pr-4 text-[15px] text-ink transition-colors duration-200 placeholder:text-muted hover:bg-canvas focus:bg-canvas focus:outline-none focus-visible:outline-none"
        />
      </div>

      <div className="mt-2 sm:mt-0 sm:w-[13.5rem]">
        <CampusPicker value={campus} onChange={setCampus} />
      </div>

      <button type="submit" className="btn btn-primary mt-2 w-full sm:mt-0 sm:w-auto">
        <IconSearch className="h-4 w-4" />
        Buscar
      </button>
    </form>
  );
}
