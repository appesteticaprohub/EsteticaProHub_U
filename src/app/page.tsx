'use client';

import { useCategories } from '@/hooks/useCategories';

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
              <div key={category.id} className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="font-medium">{category.name}</h3>
              </div>
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