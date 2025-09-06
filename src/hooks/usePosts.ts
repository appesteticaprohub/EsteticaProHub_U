import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Post {
  id: string;
  title: string;
  content: string;
  category_id: number;
  author_id: string;
  created_at: string;
}

export function usePosts(categoryId?: number, limit?: number) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPosts() {
      try {
        setLoading(true);
        setError(null);
        
        let query = supabase
          .from('posts')
          .select('*')
          .order('created_at', { ascending: false });

        // Si se proporciona categoryId, filtrar por esa categoría
        if (categoryId !== undefined) {
          query = query.eq('category_id', categoryId);
        }

        // Si se proporciona limit, limitar la cantidad de posts
        if (limit !== undefined) {
          query = query.limit(limit);
        }

        const { data, error } = await query;

        if (error) {
          setError(error.message);
        } else {
          setPosts(data || []);
        }
      } catch (err) {
        setError('Error fetching posts');
      } finally {
        setLoading(false);
      }
    }

    fetchPosts();
  }, [categoryId]);

  return { posts, loading, error };
}