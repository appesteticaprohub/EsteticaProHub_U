// components/CategoryCard/CategoryCard.tsx
'use client';

import { CategoryType, getCategoryConfig } from '@/lib/category-utils';
import CategoryHeader from './CategoryHeader';
import PostItem from './PostItem';

interface CategoryCardProps {
  title: string;
  type: CategoryType;
  posts: {
    id: string;
    title: string;
    created_at: string;
    author_name?: string;
    author_avatar?: string;
    views_count?: number;
    comments_count?: number;
  }[];
  loading: boolean;
  error: string | null;
  limit: number;
  onLimitChange: (limit: number) => void;
}

export default function CategoryCard({
  title,
  type,
  posts,
  loading,
  error,
  limit,
  onLimitChange
}: CategoryCardProps) {
  const config = getCategoryConfig(type);
  
  // Determinar qué métrica mostrar según el tipo
  const getMetricType = (): 'views' | 'comments' | 'new' => {
    if (type === 'most-viewed') return 'views';
    if (type === 'most-commented') return 'comments';
    return 'new';
  };

  return (
    <div className={`bg-white border-2 border-gray-200 ${config.hoverColor} rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden`}>
      {/* Header */}
      <CategoryHeader
        title={title}
        type={type}
        currentLimit={limit}
        onLimitChange={onLimitChange}
      />

      {/* Contenido */}
      <div className="px-6 pb-6">
        {loading && (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">Cargando posts...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <p className="text-red-500 text-sm">Error: {error}</p>
          </div>
        )}

        {!loading && !error && posts.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">No hay posts disponibles</p>
          </div>
        )}

        {!loading && !error && posts.length > 0 && (
          <div className="space-y-1">
            {posts.map((post) => (
              <PostItem
                key={post.id}
                post={post}
                showMetric={getMetricType()}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}