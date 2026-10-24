/**
 * Consultas de datos del lado del servidor usando Supabase (cliente server).
 * Solo expone campos públicos permitidos por RLS.
 * No usa service_role ni expone datos privados.
 */

import { createClient } from "@/lib/supabase/server";

/* ============================================================
 * Mapeo de enums/valores entre la BD y la UI
 * ============================================================ */

export type ObjectKind = "lost" | "found";
export type ObjectState = "reported" | "published" | "in_custody" | "delivery_prepared" | "delivered" | "closed";

/** Mapea kind de BD ('lost'/'found') a UI ('perdido'/'encontrado') */
export function mapKindToUI(kind: ObjectKind): "perdido" | "encontrado" {
  return kind === "lost" ? "perdido" : "encontrado";
}

/** Mapea state de BD a label legible */
export const STATE_LABELS: Record<ObjectState, string> = {
  reported: "Reportado",
  published: "Publicado",
  in_custody: "En custodia",
  delivery_prepared: "Entrega preparada",
  delivered: "Entregado",
  closed: "Cerrado",
};

/* ============================================================
 * Tipos para la UI (compatibles con componentes existentes)
 * ============================================================ */

export type ObjectCategory =
  | "electronicos"
  | "documentos"
  | "llaves"
  | "bolsos"
  | "ropa"
  | "accesorios"
  | "libros"
  | "otros";

export interface PublicObject {
  id: string;
  title: string;
  description: string;
  kind: "perdido" | "encontrado";
  category: ObjectCategory;
  category_id: string;
  zone: string;
  location: string;
  publishedOn: string;
  daysAgo: number;
  images: string[];
  custodyPoint: string;
  reference: string;
  campus: string;
  campusName: string;
  state: ObjectState;
  createdAt: string;
}

export interface CategoryWithSlug {
  id: string;
  name: string;
  slug: string;
}

export interface CategoryWithCount extends CategoryWithSlug {
  count: number;
}

export interface InstitutionWithName {
  id: string;
  name: string;
  city: string | null;
}

/* ============================================================
 * Consultas
 * ============================================================ */

/**
 * Obtiene categorías activas (globales + institucionales visibles por RLS).
 * Para visitantes (anon), RLS solo devuelve globales.
 * Para autenticados, devuelve globales + de su institución.
 */
export async function getCategories(): Promise<CategoryWithSlug[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug")
    .eq("is_active", true)
    .order("name");

  if (error) {
    console.error("Error fetching categories:", error);
    return [];
  }

  return data ?? [];
}

/**
 * Obtiene categorías con conteo de objetos publicados.
 * Usa los objetos publicados y sus categorías para calcular conteos reales.
 */
export async function getCategoriesWithCounts(): Promise<CategoryWithCount[]> {
  const supabase = await createClient();

  // Obtener todas las categorías activas (globales + institucionales visibles por RLS)
  const { data: categories, error: catError } = await supabase
    .from("categories")
    .select("id, name, slug")
    .eq("is_active", true)
    .order("name");

  if (catError) {
    console.error("Error fetching categories:", catError);
    return [];
  }

  if (!categories || categories.length === 0) return [];

  // Obtener objetos publicados y agrupar por categoría
  const { data: objects, error: objError } = await supabase
    .from("objects")
    .select("category_id")
    .eq("state", "published");

  if (objError) {
    console.error("Error fetching objects for category counts:", objError);
    return categories.map((c) => ({ ...c, count: 0 }));
  }

  // Contar objetos por categoría
  const countMap = new Map<string, number>();
  (objects ?? []).forEach((obj) => {
    if (obj.category_id) {
      countMap.set(obj.category_id, (countMap.get(obj.category_id) ?? 0) + 1);
    }
  });

  // Mapear categorías con sus conteos
  const result = categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    count: countMap.get(cat.id) ?? 0,
  }));
  return result;
}

/**
 * Obtiene instituciones activas (públicas).
 */
export async function getInstitutions(): Promise<InstitutionWithName[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("institutions")
    .select("id, name, city")
    .eq("is_active", true)
    .order("name");

  if (error) {
    console.error("Error fetching institutions:", error);
    return [];
  }

  return data ?? [];
}

/**
 * Obtiene objetos visibles públicamente (state = 'published' + institución activa).
 * RLS en BD ya filtra por estado e institución.
 * Aplica filtros adicionales en la query cuando se proporcionan.
 */
export interface GetObjectsOptions {
  categorySlug?: string;
  kind?: ObjectKind;
  institutionId?: string;
  zone?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export async function getObjects(options: GetObjectsOptions = {}): Promise<PublicObject[]> {
  const supabase = await createClient();

  let query = supabase
    .from("objects")
    .select(`
      id,
      title,
      description,
      kind,
      state,
      zone,
      location,
      reported_at,
      published_at,
      reference_code,
      custody_point,
      institution_id,
      category_id,
      created_at
    `)
    .eq("state", "published")
    .order("published_at", { ascending: false });

  // Filtros opcionales
  if (options.categorySlug) {
    // Resolver category_id por slug
    const { data: cat } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", options.categorySlug)
      .single();
    if (cat) query = query.eq("category_id", cat.id);
  }

  if (options.kind) {
    query = query.eq("kind", options.kind);
  }

  if (options.institutionId) {
    query = query.eq("institution_id", options.institutionId);
  }

  if (options.zone) {
    query = query.eq("zone", options.zone);
  }

  if (options.search) {
    // Búsqueda en título y descripción (PostgreSQL text search)
    query = query.or(`title.ilike.%${options.search}%,description.ilike.%${options.search}%`);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit ?? 20) - 1);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching objects:", error);
    return [];
  }

  if (!data || data.length === 0) return [];

  // Obtener nombres de categorías e instituciones en batch
  const categoryIds = [...new Set(data.map((o) => o.category_id).filter(Boolean))];
  const institutionIds = [...new Set(data.map((o) => o.institution_id).filter(Boolean))];

  const [{ data: categories }, { data: institutions }] = await Promise.all([
    categoryIds.length > 0
      ? supabase.from("categories").select("id, name, slug").in("id", categoryIds)
      : Promise.resolve({ data: [], error: null }),
    institutionIds.length > 0
      ? supabase.from("institutions").select("id, name").in("id", institutionIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const categoryMap = new Map((categories ?? []).map((c) => [c.id, { name: c.name, slug: c.slug }]));
  const institutionMap = new Map((institutions ?? []).map((i) => [i.id, i.name]));

  // Mapear a formato UI
  return data.map((obj) => {
    const category = categoryMap.get(obj.category_id ?? "");
    const institutionName = institutionMap.get(obj.institution_id ?? "");

    const publishedAt = obj.published_at ?? obj.created_at;
    const publishedDate = publishedAt ? new Date(publishedAt) : new Date();
    const today = new Date();
    const diffTime = today.getTime() - publishedDate.getTime();
    const daysAgo = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    const categorySlug = category?.slug ?? "otros";
    // Validar que el slug sea una categoría conocida
    const validCategories: ObjectCategory[] = [
      "electronicos",
      "documentos",
      "llaves",
      "bolsos",
      "ropa",
      "accesorios",
      "libros",
      "otros",
    ];
    const validatedCategory = validCategories.includes(categorySlug as ObjectCategory)
      ? (categorySlug as ObjectCategory)
      : "otros";

    return {
      id: obj.id,
      title: obj.title,
      description: obj.description,
      kind: mapKindToUI(obj.kind),
      category: validatedCategory,
      category_id: obj.category_id ?? "",
      zone: obj.zone ?? "",
      location: obj.location ?? "",
      publishedOn: publishedAt ? publishedAt.split("T")[0] : new Date().toISOString().split("T")[0],
      daysAgo: Math.max(0, daysAgo),
      images: [],
      custodyPoint: obj.custody_point ?? "",
      reference: obj.reference_code,
      campus: obj.institution_id,
      campusName: institutionName ?? obj.institution_id,
      state: obj.state,
      createdAt: obj.created_at,
    };
  });
}

/**
 * Obtiene un objeto por ID (solo si es visible públicamente: state = 'published').
 * Devuelve null si no existe o no es visible.
 */
export async function getObjectById(id: string): Promise<PublicObject | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("objects")
    .select(`
      id,
      title,
      description,
      kind,
      state,
      zone,
      location,
      reported_at,
      published_at,
      reference_code,
      custody_point,
      institution_id,
      category_id,
      created_at
    `)
    .eq("id", id)
    .eq("state", "published")
    .single();

  if (error || !data) return null;

  // Resolver categoría e institución
  const [{ data: category }, { data: institution }] = await Promise.all([
    data.category_id
      ? supabase.from("categories").select("id, name, slug").eq("id", data.category_id).single()
      : Promise.resolve({ data: null, error: null }),
    data.institution_id
      ? supabase.from("institutions").select("id, name").eq("id", data.institution_id).single()
      : Promise.resolve({ data: null, error: null }),
  ]);

  const publishedAt = data.published_at ?? data.created_at;
  const publishedDate = publishedAt ? new Date(publishedAt) : new Date();
  const today = new Date();
  const diffTime = today.getTime() - publishedDate.getTime();
  const daysAgo = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  const categorySlug = category?.slug ?? "otros";
  const validCategories: ObjectCategory[] = [
    "electronicos",
    "documentos",
    "llaves",
    "bolsos",
    "ropa",
    "accesorios",
    "libros",
    "otros",
  ];
  const validatedCategory = validCategories.includes(categorySlug as ObjectCategory)
    ? (categorySlug as ObjectCategory)
    : "otros";

  return {
    id: data.id,
    title: data.title,
    description: data.description,
    kind: mapKindToUI(data.kind),
    category: validatedCategory,
    category_id: data.category_id ?? "",
    zone: data.zone ?? "",
    location: data.location ?? "",
    publishedOn: publishedAt ? publishedAt.split("T")[0] : new Date().toISOString().split("T")[0],
    daysAgo: Math.max(0, daysAgo),
    images: [],
    custodyPoint: data.custody_point ?? "",
    reference: data.reference_code,
    campus: data.institution_id,
    campusName: institution?.name ?? data.institution_id,
    state: data.state,
    createdAt: data.created_at,
  };
}

/**
 * Obtiene objetos recientes publicados (para homepage).
 */
export async function getRecentObjects(limit = 6): Promise<PublicObject[]> {
  return getObjects({ limit });
}

/**
 * Obtiene el perfil de un usuario por su ID.
 */
export async function getUserProfile(userId: string): Promise<{
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
} | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, email, is_active, created_at, updated_at")
    .eq("id", userId)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    full_name: data.full_name,
    avatar_url: data.avatar_url,
    email: data.email,
    is_active: data.is_active,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

/**
 * Obtiene las reclamaciones (recovery_requests) de un usuario.
 */
export async function getUserClaims(userId: string): Promise<Array<{
  id: string;
  object_id: string;
  claimant_id: string;
  claimed_at: string;
  description: string;
  contact_preference: string | null;
  state: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  decision_reason: string | null;
  created_at: string;
  updated_at: string;
  object: Array<{
    id: string;
    title: string;
    kind: string;
    state: string;
    reference_code: string;
  }> | null;
}>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recovery_requests")
    .select(`
      id,
      object_id,
      claimant_id,
      claimed_at,
      description,
      contact_preference,
      state,
      reviewed_by,
      reviewed_at,
      review_notes,
      decision_reason,
      created_at,
      updated_at,
      object:objects!recovery_requests_object_id_fkey (
        id,
        title,
        kind,
        state,
        reference_code
      )
    `)
    .eq("claimant_id", userId)
    .order("claimed_at", { ascending: false });

  if (error) {
    console.error("Error fetching user claims:", error);
    return [];
  }

  return data ?? [];
}

/**
 * Obtiene los objetos publicados por un usuario.
 */
export async function getUserPublishedObjects(userId: string): Promise<Array<{
  id: string;
  title: string;
  description: string;
  kind: string;
  state: string;
  zone: string | null;
  location: string | null;
  reported_at: string;
  published_at: string | null;
  reference_code: string;
  custody_point: string | null;
  institution_id: string;
  category_id: string | null;
  created_at: string;
}>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("objects")
    .select(`
      id,
      title,
      description,
      kind,
      state,
      zone,
      location,
      reported_at,
      published_at,
      reference_code,
      custody_point,
      institution_id,
      category_id,
      created_at
    `)
    .eq("reporter_id", userId)
    .eq("state", "published")
    .order("published_at", { ascending: false });

  if (error) {
    console.error("Error fetching user published objects:", error);
    return [];
  }

  return data ?? [];
}