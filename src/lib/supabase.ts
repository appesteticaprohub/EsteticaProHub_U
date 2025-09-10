// ARCHIVO MIGRADO - YA NO USA CLIENTE SUPABASE EN EL FRONTEND
// Todas las funciones ahora usan API routes server-side

import { apiClient } from './api-client'

// Función para crear un nuevo post (migrada a API routes)
export async function createPost({
  title,
  content,
  category,
  authorId
}: {
  title: string
  content: string
  category: string
  authorId: string
}) {
  const { data, error } = await apiClient.post('/posts', {
    title,
    content,
    category,
    authorId
  })

  return { data, error }
}

// NOTA: Este archivo ya no exporta cliente Supabase para frontend
// Solo mantiene funciones de compatibilidad que usan API routes