/**
 * Utilidades para validación y procesamiento de imágenes
 */

export interface ImageValidationResult {
  valid: boolean
  error?: string
}

/**
 * Valida el formato de una imagen
 */
export function validateImageFormat(
  file: File,
  allowedFormats: string[]
): ImageValidationResult {
  if (!allowedFormats || !Array.isArray(allowedFormats) || allowedFormats.length === 0) {
    return {
      valid: false,
      error: 'Configuración de formatos no disponible'
    }
  }

  if (!allowedFormats.includes(file.type)) {
    return {
      valid: false,
      error: `Formato no permitido. Solo se aceptan: ${allowedFormats.join(', ')}`
    }
  }
  
  return { valid: true }
}

/**
 * Valida el tamaño de una imagen
 */
export function validateImageSize(
  file: File,
  maxSizeMb: number
): ImageValidationResult {
  const maxSizeBytes = maxSizeMb * 1024 * 1024
  
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `La imagen excede el tamaño máximo de ${maxSizeMb}MB`
    }
  }
  
  return { valid: true }
}

/**
 * Valida una imagen completa
 */
export function validateImage(
  file: File,
  maxSizeMb: number,
  allowedFormats: string[]
): ImageValidationResult {
  const formatValidation = validateImageFormat(file, allowedFormats)
  if (!formatValidation.valid) return formatValidation
  
  const sizeValidation = validateImageSize(file, maxSizeMb)
  if (!sizeValidation.valid) return sizeValidation
  
  return { valid: true }
}

/**
 * Genera un nombre único para una imagen
 */
export function generateUniqueFilename(originalFilename: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 9)
  const ext = originalFilename.split('.').pop()
  const nameWithoutExt = originalFilename.replace(/\.[^/.]+$/, '')
  const sanitized = nameWithoutExt.replace(/[^a-zA-Z0-9]/g, '_')
  
  return `${sanitized}_${timestamp}_${random}.${ext}`
}

/**
 * Convierte File a Buffer para Node.js
 */
export async function fileToBuffer(file: File): Promise<Buffer> {
  const arrayBuffer = await file.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

/**
 * Formatea el tamaño de archivo en formato legible
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}