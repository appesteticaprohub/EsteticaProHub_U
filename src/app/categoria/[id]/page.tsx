'use client';

import { useParams } from 'next/navigation';
import { usePosts } from '@/hooks/usePosts';
import { useCategories } from '@/hooks/useCategories';
import Link from 'next/link';

export default function CategoryPostsPage() {
  const params = useParams();
  const categoryId = parseInt(params.id as string);
  
  const { posts, loading: postsLoading, error: postsError } = usePosts(categoryId);
  const { categories, loading: categoriesLoading } = useCategories();
  
  const category = categories.find(cat => cat.id === categoryId);

  if (postsLoading || categoriesLoading) {
    return (
      <main className="p-6">
        <p>Cargando posts...</p>
      </main>
    );
  }

  if (postsError) {
    return (
      <main className="p-6">
        <p className="text-red-500">Error: {postsError}</p>
      </main>
    );
  }

  return (
    <main className="p-6">
      <div className="mb-6">
        <Link 
          href="/" 
          className="text-blue-600 hover:text-blue-800 text-sm mb-4 inline-block"
        >
          ← Volver al inicio
        </Link>
        <h1 className="text-3xl font-bold mb-4">
          {category ? category.name : 'Categoría'}
        </h1>
        <p className="text-sm text-gray-500">
          {posts.length} {posts.length === 1 ? 'post' : 'posts'} encontrados
        </p>
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No hay posts disponibles en esta categoría.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {posts.map((post) => (
            <div 
              key={post.id}
              className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-lg hover:border-blue-300 transition-all duration-300"
            >
              <div className="mb-3">
                <p className="text-xs text-gray-500 mb-2">
                  {new Date(post.created_at).toLocaleDateString('es-CO', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
                <h3 className="font-semibold text-lg text-gray-800 hover:text-blue-600 transition-colors">
                  <Link href={`/post/${post.id}`}>
                    {post.title}
                  </Link>
                </h3>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}