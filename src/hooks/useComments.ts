import useSWRInfinite from 'swr/infinite'
import { apiClient } from '@/lib/api-client'
import { Comment, PaginatedCommentsResponse } from '@/types/api'
import { mutate } from 'swr'

const fetcher = async (url: string): Promise<PaginatedCommentsResponse> => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Error al obtener comentarios')
  }
  return response.json()
}

// Función para generar la key de cada página
const getKey = (postId: string | null) => (pageIndex: number, previousPageData: PaginatedCommentsResponse | null) => {
  // Si no hay postId, no hacer fetch
  if (!postId) return null
  
  // Si es la primera página, no hay previousPageData
  if (pageIndex === 0) return `/api/posts/${postId}/comments`
  
  // Si la página anterior no tiene nextCursor, hemos llegado al final
  if (!previousPageData?.nextCursor) return null
  
  // Construir URL con cursor codificado (encodeURIComponent para manejar caracteres especiales)
  return `/api/posts/${postId}/comments?cursor=${encodeURIComponent(previousPageData.nextCursor)}`
}

export function useComments(postId: string | null) {
  const { data, error, size, setSize, isLoading, isValidating, mutate: mutateComments } = useSWRInfinite<PaginatedCommentsResponse>(
    (pageIndex, previousPageData) => getKey(postId)(pageIndex, previousPageData),
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      revalidateFirstPage: false, // No revalidar la primera página en cada mutate
    }
  )

  // Combinar todos los comentarios de todas las páginas
  const comments = data ? data.flatMap(page => page.data) : []
  
  // Verificar si hay más páginas
  const hasMore = data && data.length > 0 ? data[data.length - 1].nextCursor !== null : false
  
  // Función para cargar más comentarios
  const loadMore = () => {
    setSize(size + 1)
  }

  return { 
    comments, 
    loading: isLoading, 
    error: error?.message || null,
    hasMore,
    loadMore,
    isLoadingMore: isValidating && data && data.length > 0,
    mutateComments
  }
}

export function useCommentsWithActions(postId: string | null) {
  const { comments, loading, error, hasMore, loadMore, isLoadingMore, mutateComments } = useComments(postId)

  const createComment = async (content: string, parentId?: string) => {
    if (!postId) {
      throw new Error('Post ID es requerido')
    }

    try {
      const { data, error } = await apiClient.post<Comment>(`/posts/${postId}/comments`, {
        content,
        parent_id: parentId || null
      })

      if (error) {
        throw new Error(error)
      }

      // Revalidar todas las páginas de comentarios
      mutateComments()
      
      // Revalidar la información del post para actualizar el contador
      mutate(`/posts/${postId}`)

      return { data, error: null }
    } catch (error) {
      return { data: null, error: error instanceof Error ? error.message : 'Error desconocido' }
    }
  }

  const updateComment = async (commentId: string, content: string, postId: string) => {
    try {
      const { data, error } = await apiClient.put<Comment>(`/posts/${postId}/comments/${commentId}`, {
        content
      })

      if (error) {
        throw new Error(error)
      }

      // Revalidar la lista de comentarios
      mutateComments()

      return { data, error: null }
    } catch (error) {
      return { data: null, error: error instanceof Error ? error.message : 'Error desconocido' }
    }
  }

  const deleteComment = async (commentId: string, postId: string) => {
    try {
      const { data, error } = await apiClient.delete(`/posts/${postId}/comments/${commentId}`)

      if (error) {
        throw new Error(error)
      }

      // Revalidar la lista de comentarios
      mutateComments()
      
      // Revalidar la información del post para actualizar el contador
      mutate(`/posts/${postId}`)

      return { data, error: null }
    } catch (error) {
      return { data: null, error: error instanceof Error ? error.message : 'Error desconocido' }
    }
  }

  return {
    comments,
    loading,
    error,
    hasMore,
    loadMore,
    isLoadingMore,
    createComment,
    updateComment,
    deleteComment
  }
}