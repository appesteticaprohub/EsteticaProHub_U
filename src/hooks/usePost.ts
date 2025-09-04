import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface PostWithCategory {
  id: string;
  title: string;
  content: string;
  category_id: number;
  author_id: string;
  created_at: string;
  categories: {
    id: number;
    name: string;
  };
}

export function usePost(postId: string | null) {
  const [post, setPost] = useState<PostWithCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPost() {
      try {
        setLoading(true);
        setError(null);
        setPost(null);

        if (!postId) {
          setLoading(false);
          return;
        }
        
        const { data, error } = await supabase
          .from('posts')
          .select(`
            *,
            categories (
              id,
              name
            )
          `)
          .eq('id', postId)
          .single();

        if (error) {
          setError(error.message);
        } else {
          setPost(data);
        }
      } catch (err) {
        setError('Error fetching post');
      } finally {
        setLoading(false);
      }
    }

    fetchPost();
  }, [postId]);

  return { post, loading, error };
}