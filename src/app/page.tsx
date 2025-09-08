'use client';

import { useCategories } from '@/hooks/useCategories';
import Link from 'next/link';
import { usePosts } from '@/hooks/usePosts';

function CategoryCard({ category }: { category: any }) {
  const { posts, loading } = usePosts(category.id);
  const latestPost = posts.length > 0 ? posts[0] : null;

  return (
    <div 
      className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-lg hover:border-blue-300 transition-all duration-300 group"
    >
      <h3 className="font-semibold text-lg text-gray-800 mb-2 group-hover:text-blue-600 transition-colors">
        {category.name}
      </h3>
      
      {category.description && (
        <p className="text-gray-600 text-sm leading-relaxed mb-4">
          {category.description}
        </p>
      )}

      {/* Post más reciente */}
      {loading ? (
        <div className="bg-gray-50 rounded p-3 mb-3">
          <p className="text-sm text-gray-500">Cargando posts...</p>
        </div>
      ) : latestPost ? (
        <div className="bg-gray-50 rounded p-3 mb-3">
          <h4 className="font-medium text-sm text-gray-800 mb-1">Post más reciente:</h4>
          <Link 
            href={`/post/${latestPost.id}`} 
            className="text-sm text-blue-600 hover:text-blue-800 underline cursor-pointer"
          >
            {latestPost.title}
          </Link>
        </div>
      ) : (
        <div className="bg-gray-50 rounded p-3 mb-3">
          <p className="text-sm text-gray-500">No hay posts disponibles</p>
        </div>
      )}

      <div className="mt-4 flex items-center text-xs text-gray-400">
        <span>Creada: {new Date(category.created_at).toLocaleDateString('es-CO')}</span>
      </div>
    </div>
  );
}

export default function Home() {
  const { categories, loading, error } = useCategories();

  return (
    <main className="p-6">
      <h1 className="text-3xl font-bold mb-4">Bienvenido al Foro de Estética Profesional</h1>
      <p className="mb-8 text-gray-600">Un espacio dedicado para profesionales de la estética donde pueden compartir conocimientos, experiencias y mejores prácticas en tratamientos y cuidados especializados.</p>
      
      <section>
        <h2 className="text-2xl font-semibold mb-6">Categorías</h2>
        
        {loading && <p>Cargando categorías...</p>}
        
        {error && <p className="text-red-500">Error: {error}</p>}
        
        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        )}
        
        {!loading && !error && categories.length === 0 && (
          <p className="text-gray-500">No hay categorías disponibles.</p>
        )}
      </section>
    </main>
  );
}