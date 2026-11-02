"use server";

import { createClient } from "@/lib/supabase/server";
import { isGlobalAdminEmail } from "@/lib/supabase/tenant";

export interface CreateInstitutionParams {
  name: string;
  slug: string;
  city?: string;
  country?: string;
  email_domain?: string;
}

export interface CreateInstitutionResult {
  success: boolean;
  error?: string;
}

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function createInstitution(
  params: CreateInstitutionParams
): Promise<CreateInstitutionResult> {
  const supabase = await createClient();

  // Verificar autenticación
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "Debes iniciar sesión para registrar una universidad." };
  }

  // Verificar que sea administrador global
  if (!isGlobalAdminEmail(user.email)) {
    return { success: false, error: "No tienes permisos para registrar universidades." };
  }

  // Validar campos requeridos
  const name = params.name?.trim();
  const slug = params.slug?.trim().toLowerCase();

  if (!name) {
    return { success: false, error: "El nombre de la universidad es obligatorio." };
  }

  if (!slug) {
    return { success: false, error: "El slug es obligatorio." };
  }

  if (!SLUG_REGEX.test(slug)) {
    return {
      success: false,
      error: "El slug solo puede contener letras minúsculas, números y guiones (ej. utb, uni-norte).",
    };
  }

  try {
    const { error } = await supabase.from("institutions").insert({
      name,
      slug,
      city: params.city?.trim() || null,
      country: params.country?.trim() || "CO",
      email_domain: params.email_domain?.trim() || null,
      is_active: true,
    });

    if (error) {
      console.error("Error creating institution:", error);
      if (error.code === "23505" || error.message.toLowerCase().includes("duplicate")) {
        return { success: false, error: "El slug ya está en uso. Elige otro." };
      }
      return { success: false, error: "Error al registrar la universidad. Inténtalo de nuevo." };
    }

    return { success: true };
  } catch (error) {
    console.error("Unexpected error in createInstitution:", error);
    return { success: false, error: "Error inesperado. Inténtalo de nuevo más tarde." };
  }
}
