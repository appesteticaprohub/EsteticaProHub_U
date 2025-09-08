'use client';

import { useState } from 'react';
import { useNewestPosts, useMostViewedPosts, useMostCommentedPosts } from '@/hooks/usePosts';
import Link from 'next/link';

// Componente para el dropdown de selección de cantidad
function LimitSelector({ currentLimit, onLimitChange }: { currentLimit: number, onLimitChange: (limit: number) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const limits = [5, 10, 15];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        title="Configurar cantidad de posts"
      >
        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 bg-white border border-gray-200 rounded-md shadow-lg z-10">
          {limits.map((limit) => (
            <button
              key={limit}
              onClick={() => {
                onLimitChange(limit);
                setIsOpen(false);
              }}
              className={`block w-full px-4 py-2 text-left hover:bg-gray-100 ${
                currentLimit === limit ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
              }`}
            >
              {limit} posts
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Componente para cada categoría (card completa)
function CategoryCard({ 
  title, 
  posts, 
  loading, 
  error, 
  limit, 
  onLimitChange 
}: {
  title: string;
  posts: any[];
  loading: boolean;
  error: string | null;
  limit: number;
  onLimitChange: (limit: number) => void;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-lg transition-shadow">
      {/* Header de la categoría */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
        <LimitSelector currentLimit={limit} onLimitChange={onLimitChange} />
      </div>
      
      {/* Contenido de posts */}
      <div className="space-y-3">
        {loading && (
          <div className="text-center py-4">
            <p className="text-gray-500 text-sm">Cargando posts...</p>
          </div>
        )}
        
        {error && (
          <div className="text-center py-4">
            <p className="text-red-500 text-sm">Error: {error}</p>
          </div>
        )}
        
        {!loading && !error && posts.length === 0 && (
          <div className="text-center py-4">
            <p className="text-gray-500 text-sm">No hay posts disponibles</p>
          </div>
        )}
        
        {!loading && !error && posts.length > 0 && (
          <>
            {posts.map((post) => (
              <div key={post.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                <Link 
                  href={`/post/${post.id}`} 
                  className="flex-1 hover:text-blue-600 transition-colors"
                >
                  <span className="text-gray-900 text-sm font-medium">{post.title}</span>
                </Link>
                <span className="text-xs text-gray-500 ml-4 flex-shrink-0">
                  {new Date(post.created_at).toLocaleDateString('es-CO')}
                </span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

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
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Bienvenido al Foro de Estética Profesional</h1>
        <p className="text-gray-600">
          Un espacio dedicado para profesionales de la estética donde pueden compartir conocimientos, experiencias y mejores prácticas en tratamientos y cuidados especializados.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <CategoryCard
          title="Lo más nuevo"
          posts={newestPosts}
          loading={newestLoading}
          error={newestError}
          limit={newestLimit}
          onLimitChange={setNewestLimit}
        />

        <CategoryCard
          title="Lo más visto"
          posts={mostViewedPosts}
          loading={mostViewedLoading}
          error={mostViewedError}
          limit={mostViewedLimit}
          onLimitChange={setMostViewedLimit}
        />

        <CategoryCard
          title="Lo más comentado"
          posts={mostCommentedPosts}
          loading={mostCommentedLoading}
          error={mostCommentedError}
          limit={mostCommentedLimit}
          onLimitChange={setMostCommentedLimit}
        />
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