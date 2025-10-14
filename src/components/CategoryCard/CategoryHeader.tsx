// components/CategoryCard/CategoryHeader.tsx
'use client';

import { CategoryType, getCategoryConfig } from '@/lib/category-utils';
import LimitSelector from './LimitSelector';

interface CategoryHeaderProps {
  title: string;
  type: CategoryType;
  totalPosts: number;
  currentLimit: number;
  onLimitChange: (limit: number) => void;
}

const getIcon = (type: CategoryType) => {
  switch (type) {
    case 'newest':
      return (
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'most-viewed':
      return (
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      );
    case 'most-commented':
      return (
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      );
  }
};

export default function CategoryHeader({
  title,
  type,
  totalPosts,
  currentLimit,
  onLimitChange
}: CategoryHeaderProps) {
  const config = getCategoryConfig(type);
  const icon = getIcon(type);

  return (
    <div 
      className={`relative bg-gradient-to-r ${config.gradient} rounded-t-lg -m-6 mb-4`}
    >
      {/* Patrón de puntos */}
      <div 
        className="absolute inset-0 opacity-20 rounded-t-lg"
        style={{
          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
          backgroundSize: '20px 20px'
        }}
      />
      
      {/* Contenido */}
      <div className="relative px-10 pt-10 pb-5">
        <div className="flex items-center justify-between">
          <div className="flex-1"></div>
          <div className="flex items-center gap-3">
            {icon}
            <h2 className="text-xl font-bold text-white drop-shadow-md">
              {title}
            </h2>
          </div>
          <div className="flex-1 flex justify-end">
            <LimitSelector currentLimit={currentLimit} onLimitChange={onLimitChange} />
          </div>
        </div>
      </div>
    </div>
  );
}