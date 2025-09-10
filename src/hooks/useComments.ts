import useSWR from 'swr'
import { apiClient } from '@/lib/api-client'
import { Comment } from '@/types/api'

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