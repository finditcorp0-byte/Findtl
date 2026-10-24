"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Parámetros para responder a una solicitud de recuperación.
 */
export interface RespondRecoveryRequestParams {
  recovery_request_id: string;
  response: string;
}

/**
 * Resultado de la respuesta a la solicitud.
 */
export interface RespondRecoveryRequestResult {
  success: boolean;
  error?: string;
}

/**
 * Server Action para responder a una solicitud en estado needs_more_info.
 * Llama a la función `fn_respond_recovery_request` en la BD (SECURITY DEFINER).
 * Solo el claimant puede responder, y solo si la solicitud está en needs_more_info.
 */
export async function respondRecoveryRequest(
  params: RespondRecoveryRequestParams
): Promise<RespondRecoveryRequestResult> {
  const supabase = await createClient();

  // Verificar autenticación
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      error: "Debes iniciar sesión para responder a una reclamación.",
    };
  }

  // Validar parámetros requeridos
  if (!params.recovery_request_id?.trim()) {
    return { success: false, error: "ID de reclamación inválido" };
  }

  if (!params.response?.trim()) {
    return { success: false, error: "La respuesta es obligatoria" };
  }

  try {
    // Llamar a la función fn_respond_recovery_request en la BD (SECURITY DEFINER)
    const { error } = await supabase.rpc("fn_respond_recovery_request", {
      p_recovery_request_id: params.recovery_request_id,
      p_response: params.response.trim(),
    });

    if (error) {
      console.error("Error calling fn_respond_recovery_request:", error);
      // Mapear errores comunes de la BD a mensajes amigables
      let friendlyError = "Error al responder a la reclamación. Inténtalo de nuevo.";

      if (error.message.includes("needs_more_info")) {
        friendlyError = "Solo se puede responder a una solicitud en estado 'necesita más información'.";
      } else if (error.message.includes("Solo el reclamante")) {
        friendlyError = "Solo el reclamante original puede responder a esta solicitud.";
      } else if (error.message.includes("no tiene membresia activa")) {
        friendlyError = "No tienes una membresía activa en la institución del objeto.";
      } else if (error.message.includes("Usuario no autenticado")) {
        friendlyError = "Tu sesión ha expirado. Inicia sesión de nuevo.";
      } else if (error.message.includes("Reclamacion no encontrada")) {
        friendlyError = "La reclamación no existe o ha sido eliminada.";
      }

      return { success: false, error: friendlyError };
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error("Unexpected error in respondRecoveryRequest:", error);
    return {
      success: false,
      error: "Error inesperado. Inténtalo de nuevo más tarde.",
    };
  }
}