"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Parámetros para crear un objeto (reportar perdido/encontrado).
 * Coinciden con los parámetros de la función `fn_create_object` en la BD.
 */
export interface CreateObjectParams {
  kind: "lost" | "found";
  title: string;
  description: string;
  zone: string;
  location: string;
  category_id: string;
  reference_code: string;
  image_path?: string;
}

/**
 * Resultado de la creación del objeto.
 */
export interface CreateObjectResult {
  success: boolean;
  objectId?: string;
  error?: string;
}

/**
 * Server Action para crear un objeto (reportar perdido/encontrado).
 * Llama a la función `fn_create_object` en la base de datos (SECURITY DEFINER).
 * Requiere usuario autenticado con membresía activa en una institución.
 *
 * @param params - Datos del objeto a crear
 * @returns Resultado con success, objectId o error
 */
export async function createObject(params: CreateObjectParams): Promise<CreateObjectResult> {
  const supabase = await createClient();

  // Verificar autenticación
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      error: "Debes iniciar sesión para publicar un objeto. Inicia sesión con tu cuenta institucional.",
    };
  }

  // Validar parámetros requeridos
  if (!params.kind || !["lost", "found"].includes(params.kind)) {
    return { success: false, error: "Tipo de objeto inválido: debe ser 'lost' o 'found'" };
  }

  if (!params.title?.trim()) {
    return { success: false, error: "El título es obligatorio" };
  }

  if (!params.description?.trim()) {
    return { success: false, error: "La descripción es obligatoria" };
  }

  if (!params.zone?.trim()) {
    return { success: false, error: "La zona es obligatoria" };
  }

  if (!params.location?.trim()) {
    return { success: false, error: "La ubicación es obligatoria" };
  }

  if (!params.category_id?.trim()) {
    return { success: false, error: "La categoría es obligatoria" };
  }

  if (!params.reference_code?.trim()) {
    return { success: false, error: "El código de referencia es obligatorio" };
  }

  try {
    // Llamar a la función fn_create_object en la BD (SECURITY DEFINER)
    const { data, error } = await supabase.rpc("fn_create_object", {
      p_kind: params.kind,
      p_title: params.title.trim(),
      p_description: params.description.trim(),
      p_zone: params.zone.trim(),
      p_location: params.location.trim(),
      p_category_id: params.category_id,
      p_reference_code: params.reference_code.trim(),
      p_image_path: params.image_path ?? null,
    });

    if (error) {
      console.error("Error calling fn_create_object:", error);
      // Mapear errores comunes de la BD a mensajes amigables
      let friendlyError = "Error al crear el objeto. Inténtalo de nuevo.";

      if (error.message.includes("no tiene membresia activa")) {
        friendlyError = "No tienes una membresía activa en ninguna institución. Contacta a tu administrador.";
      } else if (error.message.includes("Categoria no valida")) {
        friendlyError = "La categoría seleccionada no es válida para tu institución.";
      } else if (error.message.includes("Usuario no autenticado")) {
        friendlyError = "Tu sesión ha expirado. Inicia sesión de nuevo.";
      } else if (error.message.includes("reference_code")) {
        friendlyError = "El código de referencia ya existe en tu institución. Usa otro.";
      }

      return { success: false, error: friendlyError };
    }

    return {
      success: true,
      objectId: data as string,
    };
  } catch (error) {
    console.error("Unexpected error in createObject:", error);
    return {
      success: false,
      error: "Error inesperado. Inténtalo de nuevo más tarde.",
    };
  }
}