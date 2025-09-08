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
        
        // Luego obtener los posts con límite si es necesario
        let query = supabase
          .from('posts')
          .select('*')
          .order('created_at', { ascending: false });

        if (categoryId !== undefined) {
          query = query.eq('category_id', categoryId);
        }

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
  }, [categoryId, limit]);

  return { posts, loading, error };
}