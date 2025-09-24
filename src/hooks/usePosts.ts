import useSWR from 'swr'
import { apiClient } from '@/lib/api-client'

interface Post {
  id: string;
  title: string;
  content: string;
  author_id: string;
  created_at: string;
  views_count: number;
  likes_count: number;
  comments_count: number;
}

// Fetcher function para SWR
const fetcher = async (url: string): Promise<Post[]> => {
  const { data, error } = await apiClient.get<Post[]>(url)
  if (error) throw new Error(error)
  return data || []
}

export function usePosts() {
  const { data: posts = [], error, isLoading } = useSWR<Post[]>(
    '/posts',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  )

  return { 
    posts, 
    loading: isLoading, 
    error: error?.message || null 
  }
}

// Hook para posts más nuevos
export function useNewestPosts(limit: number = 5) {
  const { data: posts = [], error, isLoading } = useSWR<Post[]>(
    `/posts?limit=${limit}&orderBy=created_at&ascending=false`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  )

  return { 
    posts, 
    loading: isLoading, 
    error: error?.message || null 
  }
}

// Hook para posts más vistos
export function useMostViewedPosts(limit: number = 5) {
  const { data: posts = [], error, isLoading } = useSWR<Post[]>(
    `/posts?limit=${limit}&orderBy=views_count&ascending=false`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  )

  return { 
    posts, 
    loading: isLoading, 
    error: error?.message || null 
  }
}

// Hook para posts más comentados
export function useMostCommentedPosts(limit: number = 5) {
  const { data: posts = [], error, isLoading } = useSWR<Post[]>(
    `/posts?limit=${limit}&orderBy=comments_count&ascending=false`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  )

  return { 
    posts, 
    loading: isLoading, 
    error: error?.message || null 
  }
}