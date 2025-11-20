import useSWR, { mutate } from 'swr'
import { useCallback } from 'react'
import { apiClient } from '@/lib/api-client'

interface PostDetail {
  id: string;
  title: string;
  content: string;
  author_id: string;
  created_at: string;
  views_count: number;
  likes_count: number;
  comments_count: number;
  images: string[];
  category?: string; // NUEVO: Categoría del post
  author?: {
    full_name: string | null;
    email: string;
    avatar_url: string | null;
    specialty: string | null;
    country: string | null;
  };
}

// Fetcher function para SWR
const fetcher = async (url: string): Promise<PostDetail> => {
  const { data, error } = await apiClient.get<PostDetail>(url)
  if (error) throw new Error(error)
  if (!data) throw new Error('Post not found')
  return data
}

export function usePost(postId: string | null) {
  const { data: post = null, error, isLoading } = useSWR<PostDetail>(
    postId ? `/posts/${postId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  )

  const incrementViews = useCallback(async (postId: string) => {
  try {
    const { data, error } = await apiClient.patch(`/posts/${postId}/views`, {})
    
    if (error) {
      console.error('Error incrementing views:', error)
      return
    }

    // Actualizar cache de SWR con los nuevos datos
    if (data) {
      mutate(`/posts/${postId}`, data, false)
    }
  } catch (error) {
    console.error('Error incrementing views:', error)
  }
}, [])

// Crear versión con throttling (solo una vista por post por sesión)
const incrementViewsThrottled = useCallback((postId: string) => {
  const viewedKey = `post_viewed_${postId}`
  
  // Verificar si ya se contó la vista en esta sesión
  if (typeof window !== 'undefined' && sessionStorage.getItem(viewedKey)) {
    return
  }
  
  // Marcar como visto y incrementar
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(viewedKey, 'true')
  }
  
  incrementViews(postId)
}, [incrementViews])

  const handleLikeClick = () => {
    // Esta función será manejada desde el componente para abrir el modal
    return
  }

  const handleCommentClick = () => {
    // Esta función será manejada desde el componente para abrir el modal
    return
  }

  return { 
    post, 
    loading: isLoading, 
    error: error?.message || null, 
    incrementViews: incrementViewsThrottled, 
    handleLikeClick, 
    handleCommentClick 
  }
}