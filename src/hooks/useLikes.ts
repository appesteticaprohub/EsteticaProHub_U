import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export function useLikes(postId: string | null) {
  const supabase = createClient();
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Verificar si el usuario ya dio like al post
  const checkIfLiked = useCallback(async () => {
    if (!postId || !user) {
      setIsLiked(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .single();

      setIsLiked(!!data && !error);
    } catch (error) {
      setIsLiked(false);
    }
  }, [postId, user, supabase]);

  // Obtener el contador actual de likes del post
  const fetchLikesCount = useCallback(async () => {
    if (!postId) return;

    try {
      const { data, error } = await supabase
        .from('posts')
        .select('likes_count')
        .eq('id', postId)
        .single();

      if (!error && data) {
        setLikesCount(data.likes_count || 0);
      }
    } catch (error) {
      console.error('Error fetching likes count:', error);
    }
  }, [postId, supabase]);

  // Dar like a un post
  const toggleLike = async () => {
    if (!postId || !user || loading) return;

    setLoading(true);

    try {
      if (isLiked) {
        // Quitar like
        const { error: deleteError } = await supabase
          .from('likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);

        if (!deleteError) {
          // Decrementar contador en la tabla posts
          const { data: currentPost } = await supabase
            .from('posts')
            .select('likes_count')
            .eq('id', postId)
            .single();

          if (currentPost) {
            const newCount = Math.max(0, currentPost.likes_count - 1);
            
            await supabase
              .from('posts')
              .update({ likes_count: newCount })
              .eq('id', postId);

            setLikesCount(newCount);
            setIsLiked(false);
          }
        }
      } else {
        // Dar like
        const { error: insertError } = await supabase
          .from('likes')
          .insert({
            post_id: postId,
            user_id: user.id
          });

        if (!insertError) {
          // Incrementar contador en la tabla posts
          const { data: currentPost } = await supabase
            .from('posts')
            .select('likes_count')
            .eq('id', postId)
            .single();

          if (currentPost) {
            const newCount = currentPost.likes_count + 1;
            
            await supabase
              .from('posts')
              .update({ likes_count: newCount })
              .eq('id', postId);

            setLikesCount(newCount);
            setIsLiked(true);
          }
        }
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      setLoading(false);
    }
  };

  // Efectos para cargar datos iniciales
  useEffect(() => {
    if (postId) {
      checkIfLiked();
      fetchLikesCount();
    }
  }, [postId, user, checkIfLiked, fetchLikesCount]);

  return {
    isLiked,
    likesCount,
    loading,
    toggleLike,
    checkIfLiked,
    fetchLikesCount
  };
}