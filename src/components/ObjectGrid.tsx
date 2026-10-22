import { ObjectCard } from "@/components/ObjectCard";
import type { DemoObject } from "@/lib/demo-objects";

/**
 * Retícula de objetos.
 *
 * Tres columnas en escritorio, dos en tablet y una en móvil. Cada tarjeta
 * enlaza a su ficha en /objetos/[id].
 */
export function ObjectGrid({ objects }: { objects: DemoObject[] }) {
  return (
    <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {objects.map((object) => (
        <li key={object.id}>
          <ObjectCard object={object} />
        </li>
      ))}
    </ul>
  );
}
