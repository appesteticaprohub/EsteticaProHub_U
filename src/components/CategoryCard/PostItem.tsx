// components/CategoryCard/PostItem.tsx
'use client';

import Link from 'next/link';
import { formatDate, truncateText } from '@/lib/category-utils';
import Avatar from '@/components/Avatar';

interface PostItemProps {
  post: {
    id: string;
    title: string;
    created_at: string;
    author_name?: string;
    author_avatar?: string | null;
    author_specialty?: string | null;
    author_country?: string | null;
    views_count?: number;
    comments_count?: number;
  };
  showMetric?: 'views' | 'comments' | 'new';
}

export default function PostItem({ post, showMetric }: PostItemProps) {
  const isNew = showMetric === 'new' && 
    new Date().getTime() - new Date(post.created_at).getTime() < 24 * 60 * 60 * 1000;

  const authorName = post.author_name || 'Usuario';
  
  // Obtener iniciales del nombre completo (nombre + apellido)
  const getInitials = (name: string): string => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      // Primera letra del nombre + primera letra del apellido
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    // Si solo hay una palabra, usar las primeras dos letras o solo la primera
    return parts[0].substring(0, 2).toUpperCase();
  };
  
  const authorInitials = getInitials(authorName);

  return (
    <div className="group py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 -mx-2 px-2 rounded transition-colors">
      <Link href={`/post/${post.id}`} className="flex items-start gap-3">
        {/* Avatar del autor */}
        <div className="flex-shrink-0 mt-0.5">
          <Avatar
            src={post.author_avatar || null}
            alt={authorName}
            size="sm"
            fallbackText={authorInitials}
          />
        </div>

        {/* Contenido */}
        <div className="flex-1 min-w-0">
          {/* Autor y especialidad */}
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-semibold text-gray-700">{authorName}</span>
            {post.author_specialty && (
              <>
                <span className="text-gray-300">•</span>
                <span className="text-xs text-gray-500">{post.author_specialty}</span>
              </>
            )}
            {post.author_country && (
              <>
                <span className="text-gray-300">•</span>
                <span className="text-xs text-gray-500">{post.author_country}</span>
              </>
            )}
          </div>
          
          {/* Título */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-bold text-gray-900 group-hover:text-blue-600 transition-colors leading-snug">
              {truncateText(post.title, 60)}
            </h3>
            
            {/* Badges según métrica */}
            <div className="flex-shrink-0 flex items-center gap-2">
              {showMetric === 'views' && post.views_count !== undefined && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full text-xs font-medium">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  {post.views_count}
                </span>
              )}
              
              {showMetric === 'comments' && post.comments_count !== undefined && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-pink-50 text-pink-700 rounded-full text-xs font-medium">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  {post.comments_count}
                </span>
              )}
              
              {isNew && (
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-bold">
                  NUEVO
                </span>
              )}
            </div>
          </div>
          
          {/* Fecha */}
          <p className="text-xs text-gray-500 mt-1">
            {formatDate(post.created_at)}
          </p>
        </div>
      </Link>
    </div>
  );
}