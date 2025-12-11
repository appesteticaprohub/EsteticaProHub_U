import Link from 'next/link';

export default function SearchHero() {
  return (
    <div className="bg-gradient-to-br from-pink-50 via-purple-50 to-amber-50 border border-purple-200/50 rounded-2xl p-8 md:p-12 lg:p-16 mt-8 shadow-lg">
      <div className="max-w-3xl mx-auto text-center">
        {/* Icono de búsqueda con efecto glassmorphism */}
        <div className="mb-6 inline-flex items-center justify-center">
          <div className="bg-white/40 backdrop-blur-sm border border-white/60 rounded-full p-6 shadow-xl">
            <svg 
              className="w-16 h-16 md:w-20 md:h-20 text-purple-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              strokeWidth={1.5}
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
              />
            </svg>
          </div>
        </div>

        {/* Título */}
        <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4 leading-tight">
          Explora Nuestro Contenido
        </h2>

        {/* Descripción */}
        <p className="text-base md:text-lg text-gray-600 mb-8 leading-relaxed max-w-2xl mx-auto px-4">
          Busca entre miles de publicaciones especializadas en estética profesional. 
          Encuentra tratamientos, técnicas, productos y experiencias compartidas por expertos.
        </p>

        {/* Botón de búsqueda */}
        <Link 
          href="/busqueda"
          className="inline-flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 md:px-10 py-4 rounded-xl shadow-lg shadow-purple-500/30 font-semibold text-base md:text-lg"
        >
          <svg 
            className="w-5 h-5 md:w-6 md:h-6" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
            />
          </svg>
          <span>Buscar Publicaciones</span>
        </Link>
      </div>
    </div>
  );
}