import useSWR from 'swr'
import { apiClient } from '@/lib/api-client'
import { Comment } from '@/types/api'
import { mutate } from 'swr'

const fetcher = async (url: string): Promise<Comment[]> => {
  const { data, error } = await apiClient.get<Comment[]>(url)
  if (error) throw new Error(error)
  if (!data) throw new Error('Comments not found')
  return data
}

export function useComments(postId: string | null) {
  const { data: comments = [], error, isLoading } = useSWR<Comment[]>(
    postId ? `/posts/${postId}/comments` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  )

  return { 
    comments, 
    loading: isLoading, 
    error: error?.message || null
  }
}

export function useCommentsWithActions(postId: string | null) {
  const { comments, loading, error } = useComments(postId)

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

      // Revalidar la lista de comentarios
      mutate(`/posts/${postId}/comments`)
      
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
    mutate(`/posts/${postId}/comments`)

    return { data, error: null }
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Error desconocido' }
  }
}

return {
  comments,
  loading,
  error,
  createComment,
  updateComment
}
}