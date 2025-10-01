import { createServerSupabaseClient } from './server-supabase'

/**
 * Cliente para interactuar con Supabase Storage
 * Solo se usa en el backend (API routes)
 */

const BUCKET_NAME = 'post-images'

export interface UploadImageResult {
  url: string
  path: string
}

/**
 * Sube una imagen al bucket de Supabase Storage
 * @param file - Buffer o ArrayBuffer de la imagen
 * @param userId - ID del usuario que sube la imagen
 * @param filename - Nombre del archivo
 * @returns URL pública de la imagen
 */
export async function uploadImage(
  file: Buffer | ArrayBuffer,
  userId: string,
  filename: string
): Promise<UploadImageResult> {
  const supabase = await createServerSupabaseClient()
  
  // Generar path único: userId/timestamp-random-filename
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 15)
  
  // Extraer extensión correctamente
  let extension = 'jpg' // default
  if (filename.includes('.')) {
    const parts = filename.split('.')
    const ext = parts[parts.length - 1].toLowerCase()
    // Validar que sea una extensión válida
    if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
      extension = ext
    }
  }
  
  const sanitizedName = filename.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9]/g, '_')
  const path = `${userId}/${timestamp}_${random}_${sanitizedName}.${extension}`

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, file, {
      contentType: getContentType(filename),
      upsert: true,
      cacheControl: '3600'
    })

  if (error) {
    throw new Error(`Error al subir imagen: ${error.message}`)
  }

  // Obtener URL pública
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(path)

  return {
    url: urlData.publicUrl,
    path: data.path
  }
}

/**
 * Elimina una imagen del bucket
 * @param path - Ruta de la imagen en el bucket
 */
export async function deleteImage(path: string): Promise<void> {
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([path])

  if (error) {
    throw new Error(`Error al eliminar imagen: ${error.message}`)
  }
}

/**
 * Elimina múltiples imágenes del bucket
 * @param paths - Array de rutas de imágenes
 */
export async function deleteImages(paths: string[]): Promise<void> {
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove(paths)

  if (error) {
    throw new Error(`Error al eliminar imágenes: ${error.message}`)
  }
}

/**
 * Extrae el path de una URL pública de Supabase Storage
 * @param url - URL pública de la imagen
 * @returns path relativo en el bucket
 */
export function extractPathFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url)
    const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/post-images\/(.+)/)
    return pathMatch ? pathMatch[1] : null
  } catch {
    return null
  }
}

/**
 * Verifica si una URL pertenece al bucket de imágenes
 * @param url - URL a verificar
 */
export function isValidImageUrl(url: string): boolean {
  try {
    const urlObj = new URL(url)
    return urlObj.pathname.includes(`/storage/v1/object/public/${BUCKET_NAME}/`)
  } catch {
    return false
  }
}

/**
 * Obtiene el content-type basado en la extensión del archivo
 */
function getContentType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  
  const contentTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif'
  }
  
  return contentTypes[ext || ''] || 'application/octet-stream'
}

/**
 * Obtiene las estadísticas de uso del storage
 */
export async function getStorageStats(): Promise<{
  total_images: number
  storage_used_mb: number
}> {
  const supabase = await createServerSupabaseClient()

  // Listar todos los archivos del bucket
  const { data: files, error } = await supabase.storage
    .from(BUCKET_NAME)
    .list()

  if (error) {
    throw new Error(`Error al obtener estadísticas: ${error.message}`)
  }

  const totalImages = files?.length || 0
  const totalBytes = files?.reduce((sum, file) => sum + (file.metadata?.size || 0), 0) || 0
  const storageMb = totalBytes / (1024 * 1024)

  return {
    total_images: totalImages,
    storage_used_mb: Math.round(storageMb * 100) / 100
  }
}