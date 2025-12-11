'use client';

import CategoryItem from './CategoryItem';

// Categorías con iconos y colores (mismas que en busqueda/page.tsx)
const categories = [
  {
    value: 'casos-clinicos',
    label: 'Casos Clínicos',
    icon: '💉',
    color: 'from-red-500 to-pink-500',
    hoverColor: 'hover:border-red-300'
  },
  {
    value: 'complicaciones',
    label: 'Complicaciones',
    icon: '⚠️',
    color: 'from-orange-500 to-red-500',
    hoverColor: 'hover:border-orange-300'
  },
  {
    value: 'tendencias-facial',
    label: 'Tendencias Facial',
    icon: '✨',
    color: 'from-purple-500 to-pink-500',
    hoverColor: 'hover:border-purple-300'
  },
  {
    value: 'tendencias-corporal',
    label: 'Tendencias Corporal',
    icon: '🏃',
    color: 'from-blue-500 to-cyan-500',
    hoverColor: 'hover:border-blue-300'
  },
  {
    value: 'tendencias-capilar',
    label: 'Tendencias Capilar',
    icon: '💇',
    color: 'from-green-500 to-emerald-500',
    hoverColor: 'hover:border-green-300'
  },
  {
    value: 'tendencias-spa',
    label: 'Tendencias Spa',
    icon: '🧘',
    color: 'from-indigo-500 to-purple-500',
    hoverColor: 'hover:border-indigo-300'
  },
  {
    value: 'gestion-empresarial',
    label: 'Gestión Empresarial',
    icon: '📊',
    color: 'from-gray-600 to-gray-800',
    hoverColor: 'hover:border-gray-400'
  }
];

export default function CategoryExplorer() {
  return (
    <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 border border-purple-200/50 rounded-2xl p-8 md:p-12 mt-8 shadow-lg">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mb-4 inline-flex items-center justify-center">
            <div className="bg-white/40 backdrop-blur-sm border border-white/60 rounded-full p-4 shadow-xl">
              <svg 
                className="w-12 h-12 md:w-16 md:h-16 text-purple-600" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                strokeWidth={1.5}
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" 
                />
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  d="M6 6h.008v.008H6V6z" 
                />
              </svg>
            </div>
          </div>
          
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-3">
            Explorar por Categorías
          </h2>
          <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto">
            Encuentra contenido específico navegando directamente por las categorías de tu interés
          </p>
        </div>

        {/* Grid de categorías */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {categories.map((category) => (
            <CategoryItem
              key={category.value}
              category={category}
            />
          ))}
        </div>
      </div>
    </div>
  );
}