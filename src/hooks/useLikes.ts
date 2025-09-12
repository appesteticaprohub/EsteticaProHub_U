import { useState } from 'react'
import useSWR, { mutate } from 'swr'
import { apiClient } from '@/lib/api-client'

interface LikesData {
  isLiked: boolean;
  likesCount: number;
}

interface LikesResponse {
  isLiked: boolean;
  likesCount: number;
  showSnackBar?: boolean;
}

// Fetcher function para SWR
const fetcher = async (url: string): Promise<LikesData> => {
  const { data, error } = await apiClient.get<LikesData>(url)
  if (error) throw new Error(error)
  return data || { isLiked: false, likesCount: 0 }
}

export function useLikes(postId: string | null) {
  const [loading, setLoading] = useState(false)
  
  const { data, error, mutate: mutateLikes } = useSWR<LikesData>(
    postId ? `/posts/${postId}/likes` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  )

  const isLiked = data?.isLiked || false
  const likesCount = data?.likesCount || 0

  // Función para dar/quitar like
  const toggleLike = async () => {
    if (!postId || loading) return { showSnackBar: false }

    setLoading(true)

    try {
      const { data: response, error } = await apiClient.post<LikesResponse>(
        `/posts/${postId}/likes`,
        {}
      )

      if (error) {
        if (error === 'Necesitas una suscripción') {
          return { showSnackBar: true, message: error }
        }
        console.error('Error toggling like:', error)
        return { showSnackBar: false }
      }

      if (response) {
        // Actualizar cache local inmediatamente
        mutateLikes(
          {
            isLiked: response.isLiked,
            likesCount: response.likesCount
          },
          false
        )

        // También actualizar el cache del post individual si existe
        if (postId) {
          mutate(
            `/posts/${postId}`,
            (currentPost: { likes_count: number; [key: string]: unknown } | undefined) => {
              if (currentPost) {
                return {
                  ...currentPost,
                  likes_count: response.likesCount
                }
              }
              return currentPost
            },
            false
          )
        }

        return { showSnackBar: response.showSnackBar || false }
      }
    } catch (error) {
      console.error('Error toggling like:', error)
    } finally {
      setLoading(false)
    }

    return { showSnackBar: false }
  }

  // Funciones de compatibilidad (no se usan pero mantienen la interfaz)
  const checkIfLiked = async () => {
    // SWR maneja esto automáticamente
    return
  }

  const fetchLikesCount = async () => {
    // SWR maneja esto automáticamente
    return
  }

  return {
    isLiked,
    likesCount,
    loading,
    toggleLike,
    checkIfLiked,
    fetchLikesCount
  }
}