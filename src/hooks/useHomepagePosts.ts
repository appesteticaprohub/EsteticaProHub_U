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
  category?: string;
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
  category?: string;
  author?: {
    full_name: string;
    email: string;
    avatar_url: string | null;
    specialty: string | null;
    country: string | null;
  };
}

interface HomepageData {
  newest: PostFromAPI[];
  mostViewed: PostFromAPI[];
  mostCommented: PostFromAPI[];
}

const mapPosts = (posts: PostFromAPI[]): Post[] => {
  return posts.map(post => ({
    ...post,
    author_name: post.author?.full_name || 'Usuario',
    author_avatar: post.author?.avatar_url || undefined,
    author_specialty: post.author?.specialty || undefined,
    author_country: post.author?.country || undefined,
    category: post.category || undefined
  }))
}

const fetcher = async (url: string): Promise<HomepageData> => {
  const { data, error } = await apiClient.get<HomepageData>(url)
  if (error) throw new Error(error)
  return data || { newest: [], mostViewed: [], mostCommented: [] }
}

export function useHomepagePosts(
  newestLimit: number = 5,
  mostViewedLimit: number = 5,
  mostCommentedLimit: number = 5
) {
  const { data, error, isLoading } = useSWR<HomepageData>(
    `/posts/homepage-data?newestLimit=${newestLimit}&mostViewedLimit=${mostViewedLimit}&mostCommentedLimit=${mostCommentedLimit}`,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  )

  return {
    newestPosts: data ? mapPosts(data.newest) : [],
    mostViewedPosts: data ? mapPosts(data.mostViewed) : [],
    mostCommentedPosts: data ? mapPosts(data.mostCommented) : [],
    loading: isLoading,
    error: error?.message || null
  }
}