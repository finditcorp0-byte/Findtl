import { IconRotateCcw, IconSearch } from "@/components/icons";

/**
 * Estado vacío del catálogo.
 *
 * Aparece cuando la búsqueda o los filtros no dejan resultados. Ofrece la
 * acción directa de limpiar, que es lo que el usuario necesita en ese punto.
 */
export function EmptyState({
  hasFilters,
  onClear,
}: {
  hasFilters: boolean;
  onClear: () => void;
}) {
  return (
    <div className="rounded-[1.25rem] border border-dashed border-line-strong bg-white px-6 py-16 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-forest-50 text-forest-700">
        <IconSearch className="h-5 w-5" />
      </span>

      <h3 className="mt-5 text-[18px] font-semibold tracking-[-0.015em] text-ink">
        {hasFilters
          ? "No encontramos objetos con esos criterios"
          : "Todavía no hay objetos publicados"}
      </h3>

      <p className="mx-auto mt-2.5 max-w-md text-[14.5px] leading-[1.7] text-muted">
        {hasFilters
          ? "Prueba con menos filtros o con otras palabras. Si crees que falta un registro, puedes reportarlo."
          : "En cuanto el personal autorizado registre objetos, aparecerán aquí."}
      </p>

      {hasFilters && (
        <button type="button" onClick={onClear} className="btn btn-secondary mt-6">
          <IconRotateCcw className="h-4 w-4" />
          Limpiar filtros
        </button>
      )}
    </div>
  );
}
