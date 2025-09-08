import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

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

export function usePosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPosts() {
      try {
        setLoading(true);
        setError(null);
        
        const { data, error } = await supabase
          .from('posts')
          .select('*')
          .order('created_at', { ascending: false });

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
  }, []);

  return { posts, loading, error };
}

// Hook para posts más nuevos
export function useNewestPosts(limit: number = 5) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchNewestPosts() {
      try {
        setLoading(true);
        setError(null);
        
        const { data, error } = await supabase
          .from('posts')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit);

        if (error) {
          setError(error.message);
        } else {
          setPosts(data || []);
        }
      } catch (err) {
        setError('Error fetching newest posts');
      } finally {
        setLoading(false);
      }
    }

    fetchNewestPosts();
  }, [limit]);

  return { posts, loading, error };
}

// Hook para posts más vistos
export function useMostViewedPosts(limit: number = 5) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMostViewedPosts() {
      try {
        setLoading(true);
        setError(null);
        
        const { data, error } = await supabase
          .from('posts')
          .select('*')
          .order('views_count', { ascending: false })
          .limit(limit);

        if (error) {
          setError(error.message);
        } else {
          setPosts(data || []);
        }
      } catch (err) {
        setError('Error fetching most viewed posts');
      } finally {
        setLoading(false);
      }
    }

    fetchMostViewedPosts();
  }, [limit]);

  return { posts, loading, error };
}

// Hook para posts más comentados
export function useMostCommentedPosts(limit: number = 5) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMostCommentedPosts() {
      try {
        setLoading(true);
        setError(null);
        
        const { data, error } = await supabase
          .from('posts')
          .select('*')
          .order('comments_count', { ascending: false })
          .limit(limit);

        if (error) {
          setError(error.message);
        } else {
          setPosts(data || []);
        }
      } catch (err) {
        setError('Error fetching most commented posts');
      } finally {
        setLoading(false);
      }
    }

    fetchMostCommentedPosts();
  }, [limit]);

  return { posts, loading, error };
}