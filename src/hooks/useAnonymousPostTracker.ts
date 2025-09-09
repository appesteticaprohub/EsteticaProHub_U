'use client';

import { useState, useEffect } from 'react';

export function useAnonymousPostTracker() {
  const [viewedPostsCount, setViewedPostsCount] = useState(0);

  useEffect(() => {
    // Obtener el contador actual del localStorage
    const count = localStorage.getItem('anonymous_posts_viewed');
    setViewedPostsCount(count ? parseInt(count, 10) : 0);
  }, []);

  const incrementViewedPosts = () => {
    const newCount = viewedPostsCount + 1;
    setViewedPostsCount(newCount);
    localStorage.setItem('anonymous_posts_viewed', newCount.toString());
  };

  const resetViewedPosts = () => {
    setViewedPostsCount(0);
    localStorage.removeItem('anonymous_posts_viewed');
  };

  return {
    viewedPostsCount,
    incrementViewedPosts,
    resetViewedPosts,
    hasReachedLimit: viewedPostsCount > 1 // Después del primer post
  };
}