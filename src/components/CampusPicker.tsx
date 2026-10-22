"use client";

import { useId } from "react";

import { IconBuilding, IconChevronDown } from "@/components/icons";
import { DEMO_CAMPUSES } from "@/lib/campuses";

/**
 * Selector visual de institución.
 *
 * Usa un control nativo `<select>`: es accesible por teclado en todos los
 * navegadores, se anuncia correctamente y no requiere JavaScript adicional.
 * Los datos son de demostración: la interfaz no sugiere que exista una
 * integración con sistemas universitarios reales.
 */
export function CampusPicker({
  value,
  onChange,
  id,
  className = "",
  tone = "light",
}: {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  className?: string;
  tone?: "light" | "dark";
}) {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  return (
    <div className={`relative ${className}`}>
      <label htmlFor={selectId} className="sr-only">
        Selecciona la institución
      </label>

      <IconBuilding
        aria-hidden="true"
        className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${
          tone === "dark" ? "text-lime-300" : "text-forest-600"
        }`}
      />

      <select
        id={selectId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`h-11 w-full appearance-none rounded-full border py-0 pl-9 pr-9 text-[13.5px] font-medium transition-colors duration-200 ${
          tone === "dark"
            ? "border-white/20 bg-white/10 text-white hover:border-white/40"
            : "border-line bg-white text-ink hover:border-forest-300"
        }`}
      >
        {DEMO_CAMPUSES.map((campus) => (
          <option key={campus.id} value={campus.id}>
            {campus.name}
          </option>
        ))}
      </select>

      <IconChevronDown
        aria-hidden="true"
        className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 ${
          tone === "dark" ? "text-white/60" : "text-muted"
        }`}
      />
    </div>
  );
}
