/**
 * Datos de demostración de FindIt Campus.
 *
 * Todos los registros son ficticios. No corresponden a reportes reales de
 * ninguna institución: sirven para ilustrar la interfaz del producto mientras
 * se define el proceso institucional.
 *
 * Este archivo es la fuente única de datos: la página de inicio, el catálogo
 * y la vista de detalle consultan las mismas listas, de modo que un objeto
 * se ve igual en todas partes.
 */

import { DEMO_CAMPUSES } from "@/lib/campuses";

/* Instituciones ------------------------------------------------------------ */

/** Identificadores de las instituciones de demostración. */
export const CAMPUS_IDS: Record<string, string> = DEMO_CAMPUSES.reduce<
  Record<string, string>
>((acc, campus) => {
  acc[campus.id] = campus.name;
  return acc;
}, {});

/** Nombre de la institución a partir de su identificador. */
export function campusName(id: string): string {
  return CAMPUS_IDS[id] ?? id;
}

/* Categorías ------------------------------------------------------------- */

export const OBJECT_CATEGORIES = [
  "electronicos",
  "documentos",
  "llaves",
  "bolsos",
  "ropa",
  "accesorios",
  "libros",
  "otros",
] as const;

export type ObjectCategory = (typeof OBJECT_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<ObjectCategory, string> = {
  electronicos: "Electrónicos",
  documentos: "Documentos",
  llaves: "Llaves",
  bolsos: "Bolsos y morrales",
  ropa: "Ropa",
  accesorios: "Accesorios",
  libros: "Libros y útiles",
  otros: "Otros",
};

/**
 * Fotografía representativa de cada categoría.
 *
 * Todas proceden del mismo set de imágenes de demostración, de modo que la
 * retícula de categorías se ve homogénea.
 */
export const CATEGORY_IMAGES: Record<ObjectCategory, string> = {
  electronicos: "/images/obj-portatil.webp",
  documentos: "/images/obj-documento.webp",
  llaves: "/images/obj-llaves.webp",
  bolsos: "/images/obj-bolso.webp",
  ropa: "/images/obj-ropa.webp",
  accesorios: "/images/obj-gafas.webp",
  libros: "/images/obj-libros.webp",
  otros: "/images/obj-escritorio.webp",
};

/** Icono asociado a cada categoría. */
export const CATEGORY_ICONS: Record<ObjectCategory, string> = {
  electronicos: "laptop",
  documentos: "document",
  llaves: "key",
  bolsos: "bag",
  ropa: "shirt",
  accesorios: "glasses",
  libros: "book",
  otros: "box",
};

/* Tipo de publicación ----------------------------------------------------- */

/** `perdido` = alguien perdió el objeto. `encontrado` = alguien lo halló. */
export type ObjectKind = "perdido" | "encontrado";

export const KIND_LABELS: Record<ObjectKind, string> = {
  perdido: "Perdido",
  encontrado: "Encontrado",
};

/** Plurales usados en los filtros y en los textos de la interfaz. */
export const KIND_LABELS_PLURAL: Record<ObjectKind, string> = {
  perdido: "Perdidos",
  encontrado: "Encontrados",
};

/* Objeto ------------------------------------------------------------------ */

export interface DemoObject {
  /** Identificador estable: se usa en la ruta /objetos/[id]. */
  id: string;
  title: string;
  description: string;
  kind: ObjectKind;
  category: ObjectCategory;
  /** Zona amplia del campus donde se perdió o se halló. */
  zone: string;
  /** Referencia precisa dentro de la zona. */
  location: string;
  /** Fecha de publicación (ISO, sin hora). */
  publishedOn: string;
  /** Días transcurridos desde la publicación; mantiene estable la demo. */
  daysAgo: number;
  /** Fotografías disponibles. La primera es la portada. */
  images: string[];
  /** Punto de custodia institucional donde se recibe el objeto. */
  custodyPoint: string;
  /** Referencia interna del expediente. */
  reference: string;
  /** Identificador de la institución de demostración asociada al registro. */
  campus: string;
}
export const DEMO_OBJECTS: DemoObject[] = [
  {
    id: "audifonos-inhalambricos",
    title: "Audífonos inalámbricos",
    description:
      "Estuche de carga gris con dos audífonos intraurales y un cable corto. Se perdió al final de una clase del Building Q.",
    kind: "perdido",
    category: "electronicos",
    zone: "Biblioteca central",
    location: "Salón de estudio B-204, mesa 6",
    publishedOn: "2026-10-19",
    daysAgo: 2,
    images: ["/images/obj-audifonos.webp", "/images/obj-audifonos-2.webp"],
    custodyPoint: "Punto de custodia central",
    reference: "FIC-2026-001",
    campus: "un-cartagena",
  },
  {
    id: "cargador-usb-c",
    title: "Cargador USB-C de 30 W",
    description:
      "Adaptador compacto con un cable trenzado de un metro, sin marcas de uso. Se entregó en recepción del edificio de ingeniería.",
    kind: "encontrado",
    category: "electronicos",
    zone: "Edificio de ingeniería",
    location: "Recepción del edificio de ingeniería",
    publishedOn: "2026-10-21",
    daysAgo: 0,
    images: ["/images/obj-cargador.webp", "/images/obj-cargador-2.webp"],
    custodyPoint: "Recepción del edificio de ingeniería",
    reference: "FIC-2026-002",
    campus: "ucam",
  },
  {
    id: "mouse-inalambrico",
    title: "Mouse inalámbrico gris",
    description:
      "Mouse óptico inalámbrico color gris con el receptor USB guardado en la tapa. Se halló bajo una mesa del laboratorio de computación.",
    kind: "perdido",
    category: "electronicos",
    zone: "Laboratorios",
    location: "Laboratorio de computación 3, mesa 11",
    publishedOn: "2026-10-17",
    daysAgo: 4,
    images: ["/images/obj-mouse.webp"],
    custodyPoint: "Punto de custodia central",
    reference: "FIC-2026-003",
    campus: "un-cartagena",
  },
  {
    id: "tablet-con-funda",
    title: "Tableta con funda gris",
    description:
      "Tableta de 11 pulgadas con funda rígida gris y stylus. Quedó sobre una mesa del auditorio al terminar la sesión.",
    kind: "perdido",
    category: "electronicos",
    zone: "Auditorio central",
    location: "Auditorio central, filas del fondo",
    publishedOn: "2026-10-12",
    daysAgo: 9,
    images: ["/images/obj-tablet.webp"],
    custodyPoint: "Punto de custodia central",
    reference: "FIC-2026-004",
    campus: "un-cordoba",
  },
  {
    id: "botella-reutilizable",
    title: "Botella reutilizable de 750 ml",
    description:
      "Botella metálica con tapa hermética y base antideslizante, color grafito. Encontrada sin etiqueta junto a la barra de la cafetería.",
    kind: "encontrado",
    category: "accesorios",
    zone: "Cafetería principal",
    location: "Cafetería principal, barra",
    publishedOn: "2026-10-21",
    daysAgo: 0,
    images: ["/images/obj-botella.webp", "/images/obj-botella-2.webp"],
    custodyPoint: "Cafetería principal",
    reference: "FIC-2026-005",
    campus: "un-cartagena",
  },
  {
    id: "paraguas-compacto",
    title: "Paraguas compacto negro",
    description:
      "Paraguas plegable con mango curvo y funda de transporte, de etiqueta neutra. Se halló en la taquillas del centro deportivo.",
    kind: "encontrado",
    category: "otros",
    zone: "Centro deportivo",
    location: "Centro deportivo, taquillas 24",
    publishedOn: "2026-10-15",
    daysAgo: 6,
    images: ["/images/obj-paraguas.webp", "/images/obj-paraguas-2.webp"],
    custodyPoint: "Centro deportivo",
    reference: "FIC-2026-006",
    campus: "ucam",
  },
  {
    id: "gafas-de-sol",
    title: "Gafas de sol con estuche",
    description:
      "Gafas de sol con lentes oscuras y estuche rígido. Se reportan perdidas en el recorrido entre la biblioteca y el bloque B.",
    kind: "perdido",
    category: "accesorios",
    zone: "Biblioteca central",
    location: "Biblioteca central, pasillo entre pisos 1 y 2",
    publishedOn: "2026-10-19",
    daysAgo: 2,
    images: ["/images/obj-gafas.webp", "/images/obj-gafas-2.webp"],
    custodyPoint: "Punto de custodia central",
    reference: "FIC-2026-007",
    campus: "un-cartagena",
  },
  {
    id: "cuaderno-de-apuntes",
    title: "Cuaderno con apuntes manuscritos",
    description:
      "Cuaderno matriculado de tapa dura con apuntes manuscritos de una asignatura del primer semestre. Encontrado en la sala de estudio del piso 3.",
    kind: "encontrado",
    category: "libros",
    zone: "Biblioteca central",
    location: "Sala de estudio, piso 3",
    publishedOn: "2026-10-17",
    daysAgo: 4,
    images: ["/images/obj-cuaderno.webp", "/images/obj-cuaderno-2.webp"],
    custodyPoint: "Punto de custodia central",
    reference: "FIC-2026-008",
    campus: "itb",
  },
  {
    id: "libro-metodologia",
    title: "Libro de metodología de investigación",
    description:
      "Libro de metodología de investigación con marcas de lectura y una cinta marcadora. Se perdió en la sala de cómputo.",
    kind: "perdido",
    category: "libros",
    zone: "Sala de cómputo",
    location: "Sala de cómputo 2, puesto 14",
    publishedOn: "2026-10-08",
    daysAgo: 13,
    images: ["/images/obj-libros.webp", "/images/obj-libros-2.webp"],
    custodyPoint: "Punto de custodia central",
    reference: "FIC-2026-009",
    campus: "un-cartagena",
  },
  {
    id: "carpeta-de-documentos",
    title: "Carpeta con documentos firmados",
    description:
      "Carpeta con documentos firmados y un comprobante de matrícula. Reportada como perdida en elLaboratorio de química.",
    kind: "perdido",
    category: "documentos",
    zone: "Laboratorios",
    location: "Laboratorio de química, locker 8",
    publishedOn: "2026-10-12",
    daysAgo: 9,
    images: ["/images/obj-documento.webp"],
    custodyPoint: "Punto de custodia central",
    reference: "FIC-2026-010",
    campus: "un-cordoba",
  },
  {
    id: "set-de-escritorio",
    title: "Set de escritorio",
    description:
      "Set con cuaderno, bolígrafo y tarjeta de presentación de una empresa ficticia. Hallado en la mesa de la cafetería.",
    kind: "encontrado",
    category: "otros",
    zone: "Cafetería principal",
    location: "Cafetería principal, mesa junto a la ventana",
    publishedOn: "2026-10-01",
    daysAgo: 20,
    images: ["/images/obj-escritorio.webp", "/images/obj-escritorio-2.webp"],
    custodyPoint: "Cafetería principal",
    reference: "FIC-2026-011",
    campus: "un-cartagena",
  },
  {
    id: "portatil-gris",
    title: "Portátil gris de 14 pulgadas",
    description:
      "Portátil gris con stickers de la facultad pegados en la tapa y cargador en el bolsillo interior. Perdido en el estacionamiento occidental.",
    kind: "perdido",
    category: "electronicos",
    zone: "Estacionamiento occidental",
    location: "Estacionamiento occidental, acceso norte",
    publishedOn: "2026-10-15",
    daysAgo: 6,
    images: ["/images/obj-portatil.webp", "/images/obj-portatil-2.webp"],
    custodyPoint: "Punto de custodia central",
    reference: "FIC-2026-012",
    campus: "ucam",
  },
  {
    id: "llavero-con-dos-llaves",
    title: "Llavero con dos llaves",
    description:
      "Llavero metálico con dos llaves y una control remoto de garaje, sin identificación. Encontrado en la recepción principal.",
    kind: "encontrado",
    category: "llaves",
    zone: "Recepción principal",
    location: "Recepción del edificio principal",
    publishedOn: "2026-10-08",
    daysAgo: 13,
    images: ["/images/obj-llaves.webp", "/images/obj-llaves-2.webp"],
    custodyPoint: "Recepción principal",
    reference: "FIC-2026-013",
    campus: "un-cartagena",
  },
  {
    id: "morral-de-lona",
    title: "Morral de lona verde",
    description:
      "Morral de lona color verde oscuro con correa adjustable y un bolsillo frontal. Se perdió en el corredor del bloque de arquitectura.",
    kind: "perdido",
    category: "bolsos",
    zone: "Edificio de ingeniería",
    location: "Bloque de arquitectura, corredor del segundo piso",
    publishedOn: "2026-10-01",
    daysAgo: 20,
    images: ["/images/obj-bolso.webp", "/images/obj-bolso-2.webp"],
    custodyPoint: "Punto de custodia central",
    reference: "FIC-2026-014",
    campus: "un-norte",
  },
  {
    id: "chaqueta-ligera",
    title: "Chaqueta ligera impermeable",
    description:
      "Chaqueta impermeable talla M, color gris azulado, con capota y forro interior. Quedó colgada en el respaldo de una silla del auditorio.",
    kind: "perdido",
    category: "ropa",
    zone: "Auditorio central",
    location: "Auditorio central, butacas 12 a 18",
    publishedOn: "2026-09-17",
    daysAgo: 34,
    images: ["/images/obj-ropa.webp", "/images/obj-ropa-2.webp"],
    custodyPoint: "Punto de custodia central",
    reference: "FIC-2026-015",
    campus: "un-cartagena",
  },
];

/* Zonas ------------------------------------------------------------------- */

/** Zonas disponibles, derivadas de los registros de demostración. */
export const DEMO_ZONES: string[] = Array.from(
  new Set(DEMO_OBJECTS.map((object) => object.zone)),
).sort((a, b) => a.localeCompare(b, "es"));

/* Filtros ----------------------------------------------------------------- */

export const TYPE_FILTERS = ["todos", "perdido", "encontrado"] as const;
export type TypeFilter = (typeof TYPE_FILTERS)[number];

export const CATEGORY_FILTERS = ["todas", ...OBJECT_CATEGORIES] as const;
export type CategoryFilter = (typeof CATEGORY_FILTERS)[number];

export const ZONE_FILTERS = ["todas", ...DEMO_ZONES] as const;
export type ZoneFilter = (typeof ZONE_FILTERS)[number];

export const CAMPUS_FILTERS = ["todas", ...DEMO_CAMPUSES.map((c) => c.id)] as const;
export type CampusFilter = (typeof CAMPUS_FILTERS)[number];

export const PERIOD_FILTERS = ["todos", "hoy", "semana", "quincena", "mes"] as const;
export type PeriodFilter = (typeof PERIOD_FILTERS)[number];

export const PERIOD_LABELS: Record<PeriodFilter, string> = {
  todos: "Cualquier fecha",
  hoy: "Hoy",
  semana: "Últimos 7 días",
  quincena: "Últimos 15 días",
  mes: "Último mes",
};

/** Máximo de días que cubre cada filtro de antigüedad. */
const PERIOD_RANGE: Record<Exclude<PeriodFilter, "todos">, number> = {
  hoy: 0,
  semana: 7,
  quincena: 15,
  mes: 30,
};

export interface ObjectFilters {
  query: string;
  type: TypeFilter;
  category: CategoryFilter;
  zone: ZoneFilter;
  campus: CampusFilter;
  period: PeriodFilter;
}

export const EMPTY_FILTERS: ObjectFilters = {
  query: "",
  type: "todos",
  category: "todas",
  zone: "todas",
  campus: "todas",
  period: "todos",
};

/** Interpreta un parámetro de la URL como filtro de tipo. */
export function parseTypeFilter(value: string | null): TypeFilter {
  return TYPE_FILTERS.find((option) => option === value) ?? "todos";
}

/** Interpreta un parámetro de la URL como filtro de categoría. */
export function parseCategoryFilter(value: string | null): CategoryFilter {
  return CATEGORY_FILTERS.find((option) => option === value) ?? "todas";
}

/** Interpreta un parámetro de la URL como filtro de zona. */
export function parseZoneFilter(value: string | null): ZoneFilter {
  return ZONE_FILTERS.find((option) => option === value) ?? "todas";
}

/** Interpreta un parámetro de la URL como filtro de institución. */
export function parseCampusFilter(value: string | null): CampusFilter {
  return CAMPUS_FILTERS.find((option) => option === value) ?? "todas";
}

/** Interpreta un parámetro de la URL como filtro de antigüedad. */
export function parsePeriodFilter(value: string | null): PeriodFilter {
  return PERIOD_FILTERS.find((option) => option === value) ?? "todos";
}

/** Normaliza texto para comparar sin acentos ni mayúsculas. */
export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

/**
 * Aplica búsqueda por texto y filtros combinables.
 *
 * La búsqueda revisa nombre, descripción, ubicación, zona y categoría, sin
 * distinguir mayúsculas ni acentos. Todos los filtros se combinan entre sí.
 */
export function filterDemoObjects(
  objects: DemoObject[],
  filters: ObjectFilters,
): DemoObject[] {
  const term = normalizeText(filters.query);
  const maxDays =
    filters.period === "todos" ? null : PERIOD_RANGE[filters.period];

  return objects.filter((object) => {
    if (filters.type !== "todos" && object.kind !== filters.type) return false;
    if (filters.category !== "todas" && object.category !== filters.category)
      return false;
    if (filters.zone !== "todas" && object.zone !== filters.zone) return false;
    if (filters.campus !== "todas" && object.campus !== filters.campus) return false;
    if (maxDays !== null && object.daysAgo > maxDays) return false;

    if (!term) return true;

    const haystack = [
      object.title,
      object.description,
      object.location,
      object.zone,
      CATEGORY_LABELS[object.category],
      KIND_LABELS[object.kind],
      campusName(object.campus),
    ]
      .map(normalizeText)
      .join(" ");

    return haystack.includes(term);
  });
}

/** Número de filtros distintos del valor por defecto que están activos. */
export function countActiveFilters(filters: ObjectFilters): number {
  let count = 0;
  if (filters.query.trim() !== "") count++;
  if (filters.type !== "todos") count++;
  if (filters.category !== "todas") count++;
  if (filters.zone !== "todas") count++;
  if (filters.campus !== "todas") count++;
  if (filters.period !== "todos") count++;
  return count;
}

/** ¿Hay algún filtro activo? */
export function hasActiveFilters(filters: ObjectFilters): boolean {
  return countActiveFilters(filters) > 0;
}

/** Etiquetas legibles de los filtros activos, para resumirlos en la interfaz. */
export function activeFilterLabels(filters: ObjectFilters): string[] {
  const labels: string[] = [];
  if (filters.query.trim() !== "") labels.push(`“${filters.query.trim()}”`);
  if (filters.type !== "todos") labels.push(KIND_LABELS_PLURAL[filters.type]);
  if (filters.category !== "todas") labels.push(CATEGORY_LABELS[filters.category]);
  if (filters.zone !== "todas") labels.push(filters.zone);
  if (filters.campus !== "todas") labels.push(campusName(filters.campus));
  if (filters.period !== "todos") labels.push(PERIOD_LABELS[filters.period]);
  return labels;
}

/* Formato ----------------------------------------------------------------- */

/** Antigüedad legible a partir de los días transcurridos. */
export function formatAge(daysAgo: number): string {
  if (daysAgo <= 0) return "Hoy";
  if (daysAgo === 1) return "Ayer";
  if (daysAgo < 7) return `Hace ${daysAgo} días`;
  if (daysAgo < 14) return "Hace una semana";
  if (daysAgo < 31) return `Hace ${Math.round(daysAgo / 7)} semanas`;
  return `Hace ${Math.round(daysAgo / 30)} meses`;
}

/** Fecha absoluta en formato largo español. */
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const months = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];

  if (!year || !month || !day) return isoDate;

  return `${day} de ${months[month - 1]} de ${year}`;
}

/** Buscar un objeto por su identificador. */
export function findDemoObject(id: string): DemoObject | undefined {
  return DEMO_OBJECTS.find((object) => object.id === id);
}

/** Número de registros de demostración por categoría. */
export function categoryCounts(
  objects: DemoObject[] = DEMO_OBJECTS,
): Record<ObjectCategory, number> {
  const counts: Record<ObjectCategory, number> = {
    electronicos: 0,
    documentos: 0,
    llaves: 0,
    bolsos: 0,
    ropa: 0,
    accesorios: 0,
    libros: 0,
    otros: 0,
  };

  for (const object of objects) counts[object.category] += 1;

  return counts;
}

/** Fotografía de portada de un objeto, con respaldo si no tiene imagen. */
export function coverImage(object: DemoObject): string | null {
  return object.images[0] ?? null;
}
