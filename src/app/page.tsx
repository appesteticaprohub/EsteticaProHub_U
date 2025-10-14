'use client';

import { useState } from 'react';
import { useNewestPosts, useMostViewedPosts, useMostCommentedPosts } from '@/hooks/usePosts';
import Link from 'next/link';
import WelcomeHero from '@/components/WelcomeHero';
import SearchHero from '@/components/SearchHero';
import CategoryCard from '@/components/CategoryCard/CategoryCard';

export default function Home() {
  // Estados para los límites de cada sección
  const [newestLimit, setNewestLimit] = useState(5);
  const [mostViewedLimit, setMostViewedLimit] = useState(5);
  const [mostCommentedLimit, setMostCommentedLimit] = useState(5);

  // Hooks para obtener los datos
  const { posts: newestPosts, loading: newestLoading, error: newestError } = useNewestPosts(newestLimit);
  const { posts: mostViewedPosts, loading: mostViewedLoading, error: mostViewedError } = useMostViewedPosts(mostViewedLimit);
  const { posts: mostCommentedPosts, loading: mostCommentedLoading, error: mostCommentedError } = useMostCommentedPosts(mostCommentedLimit);

  return (
    <main className="p-6 max-w-7xl mx-auto">
      <WelcomeHero />      

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <CategoryCard
          title="Lo más nuevo"
          type="newest"
          posts={newestPosts}
          loading={newestLoading}
          error={newestError}
          limit={newestLimit}
          onLimitChange={setNewestLimit}
        />

        <CategoryCard
          title="Lo más visto"
          type="most-viewed"
          posts={mostViewedPosts}
          loading={mostViewedLoading}
          error={mostViewedError}
          limit={mostViewedLimit}
          onLimitChange={setMostViewedLimit}
        />

        <CategoryCard
          title="Lo más comentado"
          type="most-commented"
          posts={mostCommentedPosts}
          loading={mostCommentedLoading}
          error={mostCommentedError}
          limit={mostCommentedLimit}
          onLimitChange={setMostCommentedLimit}
        />
      </div>

      {/* Sección de Búsqueda - Hero Mejorado */}
      <SearchHero />

      {/* Botón flotante para crear post */}
      <Link 
        href="/crear-post"
        className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6 py-4 shadow-lg hover:shadow-xl transition-all duration-200 z-50 flex items-center gap-2"
        title="Crear nuevo post"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        <span className="text-sm font-medium">Crear Post</span>
      </Link>
    </main>
  );
}