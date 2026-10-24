/**
 * Supabase Storage helpers para el bucket `object-images`.
 * Provee funciones para subir, obtener URLs firmadas y eliminar imágenes de objetos.
 */

import { createClient } from "@/lib/supabase/server";

const BUCKET_NAME = "object-images";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

export interface UploadResult {
  success: boolean;
  path?: string;
  publicUrl?: string;
  signedUrl?: string;
  error?: string;
}

/**
 * Sube una imagen al bucket `object-images` de Supabase Storage.
 * Valida tipo MIME y tamaño antes de subir.
 */
export async function uploadObjectImage(
  file: File,
  objectId: string,
  isCover: boolean = false
): Promise<UploadResult> {
  // Validar tipo MIME
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      success: false,
      error: `Tipo de archivo no permitido: ${file.type}. Permitidos: ${ALLOWED_MIME_TYPES.join(", ")}`,
    };
  }

  // Validar tamaño
  if (file.size > MAX_FILE_SIZE) {
    return {
      success: false,
      error: `El archivo excede el tamaño máximo de ${MAX_FILE_SIZE / 1024 / 1024} MB`,
    };
  }

  const supabase = await createClient();

  // Verificar autenticación
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
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error("Error uploading image:", error);
      return { success: false, error: `Error al subir imagen: ${error.message}` };
    }

    // Obtener URL pública
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(storagePath);

    // Generar URL firmada para acceso controlado (válida por 1 hora)
    const { data: signedUrlData, error: signedError } = await supabase.storage
      .from(BUCKET_NAME)
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

/**
 * Obtiene URLs firmadas para todas las imágenes de un objeto.
 */
export async function getObjectImagesSignedUrls(objectId: string): Promise<Array<{
  path: string;
  signedUrl: string;
  isCover: boolean;
}>> {
  const supabase = await createClient();

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .list(`${objectId}/`, {
      limit: 100,
      offset: 0,
      sortBy: { column: "name", order: "asc" },
    });

  if (error) {
    console.error("Error listing object images:", error);
    return [];
  }

  const results = await Promise.all(
    (data ?? []).map(async (file) => {
      const path = `${objectId}/${file.name}`;
      const { data: signedUrlData, error: signedError } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(path, 60 * 60 * 24); // 24 horas

      if (signedError) {
        console.error(`Error creating signed URL for ${path}:`, signedError);
        return null;
      }

      return {
        path,
        signedUrl: signedUrlData.signedUrl,
        isCover: file.name.startsWith("cover/"),
      };
    })
  );

  return (await Promise.all(results)).filter(Boolean) as Array<{
    path: string;
    signedUrl: string;
    isCover: boolean;
  }>;
}

/**
 * Elimina una imagen del bucket.
 */
export async function deleteObjectImage(path: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "No autenticado" };
  }

  const { error } = await supabase.storage.from(BUCKET_NAME).remove([path]);

  if (error) {
    console.error("Error deleting image:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Elimina todas las imágenes de un objeto (cover + gallery).
 */
export async function deleteAllObjectImages(objectId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .list(`${objectId}/`, { limit: 100 });

  if (error) {
    return { success: false, error: error.message };
  }

  if (!data || data.length === 0) {
    return { success: true };
  }

  const paths = data.map((file) => `${objectId}/${file.name}`);
  const { error: removeError } = await supabase.storage.from(BUCKET_NAME).remove(paths);

  if (removeError) {
    return { success: false, error: removeError.message };
  }

  return { success: true };
}