"use server";

import { createClient } from "@/lib/supabase/server";

const _BUCKET_NAME = "object-images";
const _MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const _ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

export interface UploadResult {
  success: boolean;
  path?: string;
  publicUrl?: string;
  signedUrl?: string;
  error?: string;
}

/**
 * Server Action para subir una imagen al bucket `object-images` de Supabase Storage.
 * Valida tipo MIME y tamaño antes de subir.
 */
export async function uploadObjectImageAction(
  file: File,
  objectId: string,
  isCover: boolean = false
): Promise<{
  success: boolean;
  path?: string;
  publicUrl?: string;
  signedUrl?: string;
  error?: string;
}> {
  // Validar tipo MIME
  if (!_ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      success: false,
      error: `Tipo de archivo no permitido: ${file.type}. Permitidos: ${_ALLOWED_MIME_TYPES.join(", ")}`,
    };
  }

  // Validar tamaño (5 MB)
  if (file.size > _MAX_FILE_SIZE) {
    return {
      success: false,
      error: "El archivo excede el tamaño máximo de 5 MB",
    };
  }

  // Verificar autenticación
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Debes iniciar sesión para subir imágenes" };
  }

  // Generar path único: object-images/{objectId}/{cover|gallery}/{timestamp}-{random}.{ext}
  const ext = file.type.split("/")[1] || "webp";
  const prefix = isCover ? "cover" : "gallery";
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const fileName = `${prefix}/${timestamp}-${random}.${ext}`;
  const storagePath = `${objectId}/${fileName}`;

  try {
    // Convertir File a ArrayBuffer para upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error } = await supabase.storage
      .from(_BUCKET_NAME)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error("Error uploading image:", error);
      return { success: false, error: `Error al subir imagen: ${error.message}` };
    }

    // Obtener URL pública
    const { data: publicUrlData } = supabase.storage
      .from("object-images")
      .getPublicUrl(storagePath);

    // Generar URL firmada para acceso controlado (válida por 1 hora)
    const { data: signedUrlData, error: signedError } = await supabase.storage
      .from("object-images")
      .createSignedUrl(storagePath, 60 * 60);

    if (signedError) {
      console.error("Error creating signed URL:", signedError);
    }

    return {
      success: true,
      path: storagePath,
      publicUrl: publicUrlData.publicUrl,
      signedUrl: signedUrlData?.signedUrl,
    };
  } catch (error) {
    console.error("Unexpected error uploading image:", error);
    return { success: false, error: "Error inesperado al subir imagen" };
  }
}