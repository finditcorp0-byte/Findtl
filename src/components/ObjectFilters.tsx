"use client";

import { useCallback, useEffect, useRef } from "react";

import { IconClose, IconFilter, IconRotateCcw } from "@/components/icons";
import { DEMO_CAMPUSES } from "@/lib/campuses";
import {
  CATEGORY_FILTERS,
  CATEGORY_LABELS,
  PERIOD_FILTERS,
  PERIOD_LABELS,
  TYPE_FILTERS,
  ZONE_FILTERS,
  parseCampusFilter,
  parseCategoryFilter,
  parsePeriodFilter,
  parseZoneFilter,
  type ObjectFilters,
  type TypeFilter,
} from "@/lib/demo-objects";

interface PanelProps {
  filters: ObjectFilters;
  onChange: (patch: Partial<ObjectFilters>) => void;
  onClear: () => void;
  /** Prefijo para los identificadores, útil si el panel se repite. */
  idPrefix: string;
}

const TYPE_LABELS: Record<TypeFilter, string> = {
  todos: "Todos",
  perdido: "Perdidos",
  encontrado: "Encontrados",
};

/**
 * Controles de filtrado.
 *
 * Se usa el mismo panel en el menú lateral de escritorio y en el diálogo
 * móvil: una sola definición de controles, sin lógica duplicada.
 */
export function ObjectFilterPanel({
  filters,
  onChange,
  onClear,
  idPrefix,
}: PanelProps) {
  const typeName = `${idPrefix}-tipo`;
  const categoryId = `${idPrefix}-categoria`;
  const zoneId = `${idPrefix}-zona`;
  const campusId = `${idPrefix}-campus`;
  const periodId = `${idPrefix}-fecha`;

  return (
    <div className="flex flex-col gap-6">
      <fieldset>
        <legend className="text-[12px] font-semibold uppercase tracking-[0.14em] text-forest-700">
          Tipo de registro
        </legend>

        <div className="mt-3 flex flex-wrap gap-2">
          {TYPE_FILTERS.map((option) => {
            const id = `${typeName}-${option}`;
            const checked = filters.type === option;

            return (
              <label
                key={option}
                htmlFor={id}
                className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors duration-200 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-forest-600 ${
                  checked
                    ? "border-forest-800 bg-forest-800 text-white"
                    : "border-line bg-white text-muted hover:border-forest-300 hover:text-ink"
                }`}
              >
                <input
                  id={id}
                  type="radio"
                  name={typeName}
                  value={option}
                  checked={checked}
                  onChange={() => onChange({ type: option })}
                  className="sr-only"
                />
                {TYPE_LABELS[option]}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div>
        <label
          htmlFor={categoryId}
          className="block text-[12px] font-semibold uppercase tracking-[0.14em] text-forest-700"
        >
          Categoría
        </label>
        <select
          id={categoryId}
          value={filters.category}
          onChange={(event) =>
            onChange({ category: parseCategoryFilter(event.target.value) })
          }
          className="mt-2 h-11 w-full rounded-xl border border-line bg-white px-3 text-[14px] text-ink transition-colors duration-200 hover:border-forest-300 focus:border-forest-500"
        >
          {CATEGORY_FILTERS.map((option) => (
            <option key={option} value={option}>
              {option === "todas" ? "Todas las categorías" : CATEGORY_LABELS[option]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor={zoneId}
          className="block text-[12px] font-semibold uppercase tracking-[0.14em] text-forest-700"
        >
          Zona del campus
        </label>
        <select
          id={zoneId}
          value={filters.zone}
          onChange={(event) =>
            onChange({ zone: parseZoneFilter(event.target.value) })
          }
          className="mt-2 h-11 w-full rounded-xl border border-line bg-white px-3 text-[14px] text-ink transition-colors duration-200 hover:border-forest-300 focus:border-forest-500"
        >
          {ZONE_FILTERS.map((option) => (
            <option key={option} value={option}>
              {option === "todas" ? "Todas las zonas" : option}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor={campusId}
          className="block text-[12px] font-semibold uppercase tracking-[0.14em] text-forest-700"
        >
          Institución
        </label>
        <select
          id={campusId}
          value={filters.campus}
          onChange={(event) =>
            onChange({ campus: parseCampusFilter(event.target.value) })
          }
          className="mt-2 h-11 w-full rounded-xl border border-line bg-white px-3 text-[14px] text-ink transition-colors duration-200 hover:border-forest-300 focus:border-forest-500"
        >
          <option value="todas">Todas las instituciones</option>
          {DEMO_CAMPUSES.map((campus) => (
            <option key={campus.id} value={campus.id}>
              {campus.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor={periodId}
          className="block text-[12px] font-semibold uppercase tracking-[0.14em] text-forest-700"
        >
          Fecha de publicación
        </label>
        <select
          id={periodId}
          value={filters.period}
          onChange={(event) =>
            onChange({ period: parsePeriodFilter(event.target.value) })
          }
          className="mt-2 h-11 w-full rounded-xl border border-line bg-white px-3 text-[14px] text-ink transition-colors duration-200 hover:border-forest-300 focus:border-forest-500"
        >
          {PERIOD_FILTERS.map((option) => (
            <option key={option} value={option}>
              {PERIOD_LABELS[option]}
            </option>
          ))}
        </select>
      </div>

      <button type="button" onClick={onClear} className="btn btn-secondary w-full">
        <IconRotateCcw className="h-4 w-4" />
        Limpiar filtros
      </button>
    </div>
  );
}

/**
 * Zona de filtros del catálogo.
 *
 * En escritorio es una columna fija; en móvil se abre en un diálogo nativo
 * que atrapa el foco, se cierra con Escape y devuelve el foco al botón que
 * lo abrió.
 */
export function ObjectFilters({
  filters,
  onChange,
  onClear,
  activeCount,
}: {
  filters: ObjectFilters;
  onChange: (patch: Partial<ObjectFilters>) => void;
  onClear: () => void;
  activeCount: number;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    const dialog = dialogRef.current;
    if (dialog?.open) dialog.close();
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const onCancel = () => {
      triggerRef.current?.focus();
    };

    dialog.addEventListener("cancel", onCancel);
    return () => dialog.removeEventListener("cancel", onCancel);
  }, []);

  return (
    <>
      {/* Escritorio ------------------------------------------------------ */}
      <aside
        aria-label="Filtros del catálogo"
        className="hidden lg:block lg:sticky lg:top-24"
      >
        <div className="rounded-[1.25rem] border border-line bg-white p-5 shadow-soft">
          <h2 className="flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em] text-ink">
            <IconFilter className="h-4 w-4 text-forest-700" />
            Filtros
          </h2>

          <div className="mt-5">
            <ObjectFilterPanel
              filters={filters}
              onChange={onChange}
              onClear={onClear}
              idPrefix="escritorio"
            />
          </div>
        </div>
      </aside>

      {/* Móvil ------------------------------------------------------------ */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="btn btn-secondary w-full lg:hidden"
        aria-haspopup="dialog"
      >
        <IconFilter className="h-4 w-4" />
        Filtros
        {activeCount > 0 && (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-forest-800 px-1.5 text-[11px] font-semibold text-white">
            {activeCount}
          </span>
        )}
      </button>

      <dialog
        ref={dialogRef}
        aria-label="Filtros del catálogo"
        onClose={() => triggerRef.current?.focus()}
        className="panel-in m-0 mt-0 h-full max-h-none w-full max-w-none overflow-y-auto bg-white p-0 backdrop:bg-forest-950/45 backdrop:backdrop-blur-[3px] sm:m-auto sm:h-auto sm:max-w-md sm:rounded-[1.5rem] sm:shadow-deep"
      >
        <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
          <h2 className="text-[16px] font-semibold tracking-[-0.01em] text-ink">
            Filtros
          </h2>

          <button
            type="button"
            onClick={close}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-white text-muted transition-colors duration-200 hover:border-forest-300 hover:text-ink"
          >
            <IconClose className="h-4 w-4" />
            <span className="sr-only">Cerrar filtros</span>
          </button>
        </div>

        <div className="px-5 py-5">
          <ObjectFilterPanel
            filters={filters}
            onChange={onChange}
            onClear={onClear}
            idPrefix="movil"
          />
        </div>

        <div className="sticky bottom-0 border-t border-line bg-white px-5 py-4">
          <button type="button" onClick={close} className="btn btn-primary w-full">
            Ver resultados
          </button>
        </div>
      </dialog>
    </>
  );
}
