/**
 * Datos de demostración de FindIt Campus.
 *
 * Todos los registros de este archivo son ficticios. No corresponden a
 * reportes reales de ninguna institución y sirven únicamente para ilustrar
 * la interfaz durante el desarrollo del producto.
 */

export type ObjectCategory = "tecnologia" | "accesorios" | "documentos" | "otros";

export type ObjectStatus = "disponible" | "en-revision";

export type ArtKey =
  | "headphones"
  | "charger"
  | "mouse"
  | "bottle"
  | "umbrella"
  | "glasses"
  | "notebook"
  | "keys";

export interface DemoObject {
  id: string;
  name: string;
  category: ObjectCategory;
  description: string;
  location: string;
  registeredOn: string;
  status: ObjectStatus;
  custodyPoint: string;
  reference: string;
  art: ArtKey;
}

export const CATEGORY_FILTERS = [
  "todos",
  "tecnologia",
  "accesorios",
  "documentos",
  "otros",
] as const;

export type CategoryFilter = (typeof CATEGORY_FILTERS)[number];

export const CATEGORY_LABELS: Record<CategoryFilter, string> = {
  todos: "Todos",
  tecnologia: "Tecnología",
  accesorios: "Accesorios",
  documentos: "Documentos",
  otros: "Otros",
};

export const STATUS_LABELS: Record<ObjectStatus, string> = {
  disponible: "Disponible",
  "en-revision": "En revisión",
};

export const DEMO_OBJECTS: DemoObject[] = [
  {
    id: "audifonos",
    name: "Audífonos inalámbricos",
    category: "tecnologia",
    description:
      "Estuche de carga con dos audífonos intraurales. Se localizaron junto a una mesa de estudio.",
    location: "Biblioteca central · planta 1",
    registeredOn: "14 de marzo",
    status: "disponible",
    custodyPoint: "Punto de custodia central",
    reference: "FIC-0000-001",
    art: "headphones",
  },
  {
    id: "cargador-usbc",
    name: "Cargador USB-C",
    category: "tecnologia",
    description:
      "Cargador compacto de 30 W con cable trenzado de un metro, sin marcas de uso.",
    location: "Sala de cómputo · edificio de ingeniería",
    registeredOn: "12 de marzo",
    status: "disponible",
    custodyPoint: "Punto de custodia central",
    reference: "FIC-0000-002",
    art: "charger",
  },
  {
    id: "mouse",
    name: "Mouse inalámbrico",
    category: "tecnologia",
    description:
      "Mouse óptico inalámbrico color gris, con el receptor USB guardado en la tapa.",
    location: "Auditorio central · filas traseras",
    registeredOn: "10 de marzo",
    status: "en-revision",
    custodyPoint: "Punto de custodia central",
    reference: "FIC-0000-003",
    art: "mouse",
  },
  {
    id: "botella",
    name: "Botella reutilizable",
    category: "accesorios",
    description:
      "Botella metálica de 750 ml con tapa hermética y base antideslizante.",
    location: "Cafetería principal · barra",
    registeredOn: "9 de marzo",
    status: "disponible",
    custodyPoint: "Punto de custodia central",
    reference: "FIC-0000-004",
    art: "bottle",
  },
  {
    id: "paraguas",
    name: "Paraguas negro",
    category: "accesorios",
    description:
      "Paraguas compacto con mango curvo y funda de transporte, de etiqueta neutra.",
    location: "Estacionamiento occidental · acceso norte",
    registeredOn: "7 de marzo",
    status: "disponible",
    custodyPoint: "Punto de custodia central",
    reference: "FIC-0000-005",
    art: "umbrella",
  },
  {
    id: "estuche-gafas",
    name: "Estuche de gafas",
    category: "accesorios",
    description:
      "Estuche rígido con lentes de sol montadas en su interior, cerrado con broche.",
    location: "Centro deportivo · taquillas",
    registeredOn: "6 de marzo",
    status: "en-revision",
    custodyPoint: "Punto de custodia central",
    reference: "FIC-0000-006",
    art: "glasses",
  },
  {
    id: "cuaderno",
    name: "Cuaderno universitario",
    category: "documentos",
    description:
      "Cuaderno matriculado con apuntes manuscritos de una asignatura del primer semestre.",
    location: "Sala de estudio · piso 3",
    registeredOn: "5 de marzo",
    status: "disponible",
    custodyPoint: "Punto de custodia central",
    reference: "FIC-0000-007",
    art: "notebook",
  },
  {
    id: "llaves",
    name: "Llaves con llavero",
    category: "otros",
    description:
      "Llavero metálico con dos llaves y un control remoto de garaje, sin identificación.",
    location: "Recepción del edificio principal",
    registeredOn: "4 de marzo",
    status: "disponible",
    custodyPoint: "Punto de custodia central",
    reference: "FIC-0000-008",
    art: "keys",
  },
];

/** Normaliza texto para comparar sin acentos ni mayúsculas. */
export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

/** Búsqueda por nombre y descripción + filtro por categoría. */
export function filterDemoObjects(
  objects: DemoObject[],
  query: string,
  category: CategoryFilter,
): DemoObject[] {
  const term = normalizeText(query);

  return objects.filter((object) => {
    const matchesCategory =
      category === "todos" || object.category === category;

    if (!matchesCategory) return false;
    if (!term) return true;

    return (
      normalizeText(object.name).includes(term) ||
      normalizeText(object.description).includes(term)
    );
  });
}
