import useSWR from 'swr'
import { apiClient } from '@/lib/api-client'

interface Post {
  id: string;
  title: string;
  content: string;
  author_id: string;
  author_name?: string;
  author_avatar?: string;
  author_specialty?: string;
  author_country?: string;
  created_at: string;
  views_count: number;
  likes_count: number;
  comments_count: number;
  category?: string; // NUEVO: Categoría del post
}

interface PostFromAPI {
  id: string;
  title: string;
  content: string;
  author_id: string;
  created_at: string;
  views_count: number;
  likes_count: number;
  comments_count: number;
  category?: string; // NUEVO: Categoría del post
  author?: {
    full_name: string;
    email: string;
    avatar_url: string | null;
    specialty: string | null;
    country: string | null;
  };
}

const fetcher = async (url: string): Promise<Post[]> => {
  const { data, error } = await apiClient.get<PostFromAPI[]>(url)
  if (error) throw new Error(error)
  
  const mappedData = (data || []).map(post => ({
    ...post,
    author_name: post.author?.full_name || 'Usuario',
    author_avatar: post.author?.avatar_url || undefined,
    author_specialty: post.author?.specialty || undefined,
    author_country: post.author?.country || undefined,
    category: post.category || undefined // NUEVO: Incluir categoría
  }))
  
  console.log('Posts mapeados:', mappedData) // DEBUG
  
  return mappedData
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