'use client';

import { useState } from 'react';
import { useNewestPosts, useMostViewedPosts, useMostCommentedPosts } from '@/hooks/usePosts';
import Link from 'next/link';
import WelcomeHero from '@/components/WelcomeHero';
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

      {/* Sección de Búsqueda - Hero */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-8 mt-8 shadow-sm">
        <div className="max-w-3xl mx-auto text-center">
          <div className="mb-4">
            <svg 
              className="w-16 h-16 mx-auto text-blue-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">
            Explora Nuestro Contenido
          </h2>
          <p className="text-gray-600 mb-6">
            Busca entre miles de artículos especializados en estética profesional. 
            Encuentra tratamientos, técnicas, productos y experiencias compartidas por expertos.
          </p>
          <Link 
            href="/busqueda"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 font-medium"
          >
            <svg 
              className="w-5 h-5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
              />
            </svg>
            Buscar Artículos
          </Link>
        </div>
      </div>

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