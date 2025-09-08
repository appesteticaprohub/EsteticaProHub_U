'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function CrearPost() {
  const [categoria, setCategoria] = useState('');
  const [titulo, setTitulo] = useState('');
  const [contenido, setContenido] = useState('');

  // Categorías de ejemplo para estética profesional
  const categorias = [
    { value: '', label: 'Seleccionar categoría' },
    { value: 'tratamientos-faciales', label: 'Tratamientos Faciales' },
    { value: 'tratamientos-corporales', label: 'Tratamientos Corporales' },
    { value: 'depilacion', label: 'Depilación' },
    { value: 'cuidado-piel', label: 'Cuidado de la Piel' },
    { value: 'productos', label: 'Productos y Equipos' },
    { value: 'capacitacion', label: 'Capacitación y Cursos' },
    { value: 'experiencias', label: 'Experiencias y Casos' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Por ahora solo mostrar en consola
    console.log({ categoria, titulo, contenido });
  };

  return (
    <main className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link 
            href="/"
            className="text-blue-600 hover:text-blue-800 transition-colors"
          >
            ← Volver al inicio
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-gray-800">Crear Nuevo Post</h1>
        <p className="text-gray-600 mt-2">
          Comparte tu conocimiento y experiencia con la comunidad de estética profesional
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Categoría */}
          <div>
            <label htmlFor="categoria" className="block text-sm font-medium text-gray-700 mb-2">
              Categoría *
            </label>
            <select
              id="categoria"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {categorias.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Título */}
          <div>
            <label htmlFor="titulo" className="block text-sm font-medium text-gray-700 mb-2">
              Título *
            </label>
            <input
              type="text"
              id="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              required
              placeholder="Ingresa el título de tu post"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Contenido */}
          <div>
            <label htmlFor="contenido" className="block text-sm font-medium text-gray-700 mb-2">
              Contenido *
            </label>
            <textarea
              id="contenido"
              value={contenido}
              onChange={(e) => setContenido(e.target.value)}
              required
              rows={8}
              placeholder="Escribe el contenido de tu post..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical"
            />
          </div>

          {/* Botones */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md transition-colors"
            >
              Crear Post
            </button>
            <Link
              href="/"
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2 rounded-md transition-colors"
            >
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}