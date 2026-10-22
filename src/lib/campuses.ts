/**
 * Instituciones de demostración.
 *
 * Son nombres reales de universidades colombianas usados únicamente como
 * contenido de ejemplo: FindIt Campus todavía no está integrado con ningún
 * sistema institucional ni con ningún servicio de autenticación.
 */

export interface Campus {
  id: string;
  name: string;
  city: string;
}

export const DEMO_CAMPUSES: Campus[] = [
  { id: "un-cartagena", name: "Universidad de Cartagena", city: "Cartagena" },
  { id: "ucam", name: "UCAM Campus Cartagena", city: "Cartagena" },
  { id: "un-cordoba", name: "Universidad de Córdoba", city: "Montería" },
  { id: "un-norte", name: "Universidad del Norte", city: "Barranquilla" },
  { id: "itb", name: "Instituto Tecnológico de Bolívar", city: "Cartagena" },
];

export const DEFAULT_CAMPUS = DEMO_CAMPUSES[0];

/** Busca una institución por su identificador. */
export function findCampus(id: string | null | undefined): Campus {
  return DEMO_CAMPUSES.find((campus) => campus.id === id) ?? DEFAULT_CAMPUS;
}
