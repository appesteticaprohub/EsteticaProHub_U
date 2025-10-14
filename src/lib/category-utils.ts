// lib/category-utils.ts

export type CategoryType = 'newest' | 'most-viewed' | 'most-commented';

export interface CategoryConfig {
  gradient: string;
  badgeColor: string;
  hoverColor: string;
  iconPath: string;
  iconViewBox?: string;
}

export const getCategoryConfig = (type: CategoryType): CategoryConfig => {
  const configs: Record<CategoryType, CategoryConfig> = {
    'newest': {
      gradient: 'from-blue-900 to-blue-600',
      badgeColor: 'bg-blue-100 text-blue-700',
      hoverColor: 'hover:border-blue-300',
      iconPath: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
    },
    'most-viewed': {
      gradient: 'from-purple-900 to-purple-600',
      badgeColor: 'bg-purple-100 text-purple-700',
      hoverColor: 'hover:border-purple-300',
      iconPath: 'M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z'
    },
    'most-commented': {
      gradient: 'from-pink-900 to-pink-600',
      badgeColor: 'bg-pink-100 text-pink-700',
      hoverColor: 'hover:border-pink-300',
      iconPath: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z'
    }
  };

  return configs[type];
};

export const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short'
  });
};

export const truncateText = (text: string, maxLength: number = 50): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};