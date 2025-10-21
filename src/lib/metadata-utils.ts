// src/lib/metadata-utils.ts

import { htmlToPlainText } from './html-sanitizer';

/**
 * Extrae los primeros N caracteres del contenido HTML (sin tags)
 * para usar como descripción en meta tags
 */
export function extractDescription(htmlContent: string, maxLength: number = 160): string {
  if (!htmlContent) return '';
  
  // Convertir HTML a texto plano
  const plainText = htmlToPlainText(htmlContent);
  
  // Limpiar espacios extras
  const cleanText = plainText.replace(/\s+/g, ' ').trim();
  
  // Truncar a maxLength caracteres
  if (cleanText.length <= maxLength) {
    return cleanText;
  }
  
  // Truncar y agregar puntos suspensivos
  return cleanText.substring(0, maxLength).trim() + '...';
}

/**
 * Obtiene la primera imagen de un array de URLs
 * Retorna null si no hay imágenes
 */
export function getFirstImage(images: string[] | null | undefined): string | null {
  if (!images || images.length === 0) return null;
  return images[0];
}

/**
 * Genera un título optimizado para SEO
 * Formato: "Título del Post - Nombre del Sitio"
 */
export function generatePageTitle(postTitle: string, siteName: string = 'EsteticaProHub'): string {
  return `${postTitle} - ${siteName}`;
}