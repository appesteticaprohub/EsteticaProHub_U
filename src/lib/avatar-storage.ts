import { createServerSupabaseClient } from './server-supabase'

/**
 * Cliente para interactuar con el bucket de avatares en Supabase Storage
 * Solo se usa en el backend (API routes)
 */

const AVATAR_BUCKET_NAME = 'avatars'
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB en bytes
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

export interface UploadAvatarResult {
  url: string
  path: string
}

/**
 * Valida el tipo y tamaño del archivo
 */
export function validateAvatarFile(file: File | Buffer, contentType: string, size: number): { valid: boolean; error?: string } {
  // Validar tipo MIME
  if (!ALLOWED_TYPES.includes(contentType)) {
    return {
      valid: false,
      error: 'Formato no permitido. Solo se permiten: JPG, PNG, WEBP'
    }
  }

  // Validar tamaño
  if (size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `El archivo es muy grande. Máximo permitido: ${MAX_FILE_SIZE / (1024 * 1024)}MB`
    }
  }

  return { valid: true }
}

/**
 * Sube un avatar al bucket de Supabase Storage
 * @param file - Buffer o ArrayBuffer de la imagen
 * @param userId - ID del usuario que sube el avatar
 * @param contentType - Tipo MIME del archivo
 * @returns URL pública del avatar y path
 */
export async function uploadAvatar(
  file: Buffer | ArrayBuffer,
  userId: string,
  contentType: string
): Promise<UploadAvatarResult> {
  const supabase = await createServerSupabaseClient()
  
  // Generar nombre único para el avatar
  const timestamp = Date.now()
  const extension = getExtensionFromMimeType(contentType)
  const path = `${userId}/avatar_${timestamp}.${extension}`

  const { data, error } = await supabase.storage
    .from(AVATAR_BUCKET_NAME)
    .upload(path, file, {
      contentType,
      upsert: true, // Sobrescribe si existe
      cacheControl: '3600'
    })

  if (error) {
    throw new Error(`Error al subir avatar: ${error.message}`)
  }

  // Obtener URL pública
  const { data: urlData } = supabase.storage
    .from(AVATAR_BUCKET_NAME)
    .getPublicUrl(path)

  return {
    url: urlData.publicUrl,
    path: data.path
  }
}

/**
 * Elimina el avatar actual del usuario
 * @param path - Ruta del avatar en el bucket
 */
export async function deleteAvatar(path: string): Promise<void> {
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase.storage
    .from(AVATAR_BUCKET_NAME)
    .remove([path])

  if (error) {
    throw new Error(`Error al eliminar avatar: ${error.message}`)
  }
}

/**
 * Extrae el path de una URL pública de avatar
 * @param url - URL pública del avatar
 * @returns path relativo en el bucket
 */
export function extractAvatarPathFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url)
    const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/avatars\/(.+)/)
    return pathMatch ? pathMatch[1] : null
  } catch {
    return null
  }
}

/**
 * Verifica si una URL pertenece al bucket de avatares
 * @param url - URL a verificar
 */
export function isValidAvatarUrl(url: string): boolean {
  try {
    const urlObj = new URL(url)
    return urlObj.pathname.includes(`/storage/v1/object/public/${AVATAR_BUCKET_NAME}/`)
  } catch {
    return false
  }
}

/**
 * Obtiene la extensión del archivo basado en el MIME type
 */
function getExtensionFromMimeType(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp'
  }
  
  return mimeToExt[mimeType] || 'jpg'
}