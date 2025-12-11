'use client';

import Link from 'next/link';

interface CategoryItemProps {
  category: {
    value: string;
    label: string;
    icon: string;
    color: string;
    hoverColor: string;
  };
}

export default function CategoryItem({ category }: CategoryItemProps) {
  return (
    <Link href={`/busqueda?category=${category.value}`}>
      <div className={`bg-white border-2 border-gray-200 ${category.hoverColor} rounded-xl p-4 md:p-6 shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer group`}>
        {/* Icono con gradiente */}
        <div className={`mb-4 mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br ${category.color} flex items-center justify-center group-hover:scale-110 transition-transform duration-200`}>
          <span className="text-2xl">{category.icon}</span>
        </div>
        
        {/* Título */}
        <h3 className="text-center category-text-mobile font-semibold text-gray-800 leading-tight group-hover:text-purple-600 transition-colors">
          {category.label}
        </h3>
      </div>
    </Link>
  );
}