"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Parámetros para crear una solicitud de recuperación.
 */
export interface CreateRecoveryRequestParams {
  object_id: string;
  description: string;
  contact_preference?: string;
}

/**
 * Resultado de la creación de la solicitud.
 */
export interface CreateRecoveryRequestResult {
  success: boolean;
  requestId?: string;
  error?: string;
}

/**
 * Server Action para crear una solicitud de recuperación (reclamación).
 * Llama a la función `fn_create_recovery_request` en la BD (SECURITY DEFINER).
 * Requiere usuario autenticado con membresía activa en la institución del objeto.
 */
export async function createRecoveryRequest(
  params: CreateRecoveryRequestParams
): Promise<CreateRecoveryRequestResult> {
  const supabase = await createClient();

  // Verificar autenticación
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      error: "Debes iniciar sesión para reclamar un objeto. Inicia sesión con tu cuenta institucional.",
    };
  }

  // Validar parámetros requeridos
  if (!params.object_id?.trim()) {
    return { success: false, error: "ID de objeto inválido" };
  }

  if (!params.description?.trim()) {
    return { success: false, error: "La descripción es obligatoria" };
  }

  try {
    // Llamar a la función fn_create_recovery_request en la BD (SECURITY DEFINER)
    const { data, error } = await supabase.rpc("fn_create_recovery_request", {
      p_object_id: params.object_id,
      p_description: params.description.trim(),
      p_contact_preference: params.contact_preference?.trim() ?? null,
    });

    if (error) {
      console.error("Error calling fn_create_recovery_request:", error);
      // Mapear errores comunes de la BD a mensajes amigables
      let friendlyError = "Error al crear la reclamación. Inténtalo de nuevo.";

      if (error.message.includes("no esta disponible para reclamacion")) {
        friendlyError = "Este objeto no está disponible para reclamación.";
      } else if (error.message.includes("no tiene membresia activa")) {
        friendlyError = "No tienes una membresía activa en la institución de este objeto.";
      } else if (error.message.includes("Ya existe una solicitud activa")) {
        friendlyError = "Ya tienes una solicitud activa para este objeto.";
      } else if (error.message.includes("Usuario no autenticado")) {
        friendlyError = "Tu sesión ha expirado. Inicia sesión de nuevo.";
      } else if (error.message.includes("Objeto no encontrado")) {
        friendlyError = "El objeto no existe o ha sido eliminado.";
      }

      return { success: false, error: friendlyError };
    }

    return {
      success: true,
      requestId: data as string,
    };
  } catch (error) {
    console.error("Unexpected error in createRecoveryRequest:", error);
    return {
      success: false,
      error: "Error inesperado. Inténtalo de nuevo más tarde.",
    };
  }
}