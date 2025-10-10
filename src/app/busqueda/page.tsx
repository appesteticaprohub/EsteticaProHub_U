'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { useSearch } from '@/hooks/useSearch';
import Modal from '@/components/Modal';
import PaymentRecoveryModal from '@/components/PaymentRecoveryModal';

export default function BusquedaPage() {
  const { session, userType, loading: authLoading } = useAuth();
  const { subscriptionStatus, subscriptionData, loading: statusLoading } = useSubscriptionStatus();
  const loading = authLoading || statusLoading;
  const router = useRouter();
  const { results, loading: searchLoading, error: searchError, search } = useSearch();

  // Estados para modales
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalButtons, setModalButtons] = useState<'subscription' | 'login' | 'renew'>('subscription');
  const [showPaymentRecoveryModal, setShowPaymentRecoveryModal] = useState(false);

  // Estados para filtros
  const [filters, setFilters] = useState({
    title: '',
    content: '',
    author: '',
    category: '',
    date_from: '',
    date_to: '',
    sort_by: 'created_at',
    sort_order: 'desc' as 'asc' | 'desc',
    page: 1
  });

  // Categorías (las mismas de crear-post)
  const categorias = [
    { value: '', label: 'Todas las categorías' },
    { value: 'tratamientos-faciales', label: 'Tratamientos Faciales' },
    { value: 'tratamientos-corporales', label: 'Tratamientos Corporales' },
    { value: 'depilacion', label: 'Depilación' },
    { value: 'cuidado-piel', label: 'Cuidado de la Piel' },
    { value: 'productos', label: 'Productos y Equipos' },
    { value: 'capacitacion', label: 'Capacitación y Cursos' },
    { value: 'experiencias', label: 'Experiencias y Casos' }
  ];

  // Validación de suscripción (igual que crear-post)
  useEffect(() => {
    if (!loading) {
      // Usuario anónimo o sin sesión
      if (!session || userType === 'anonymous') {
        setModalMessage('Necesitas una suscripción para buscar');
        setModalButtons('subscription');
        setShowModal(true);
        return;
      }

      // Usuario con estado Active - puede buscar
      if (session && userType === 'premium' && subscriptionStatus === 'Active') {
        setShowModal(false);
        return;
      }

      // Usuario con estado Expired
      if (session && userType === 'premium' && subscriptionStatus === 'Expired') {
        setModalMessage('Necesitas renovar tu suscripción para buscar');
        setModalButtons('renew');
        setShowModal(true);
        return;
      }

      // Usuario con estado Cancelled - verificar si aún tiene acceso
      if (session && userType === 'premium' && subscriptionStatus === 'Cancelled') {
        const now = new Date();
        const expirationDate = subscriptionData.subscription_expires_at ? new Date(subscriptionData.subscription_expires_at) : null;
        
        if (expirationDate && now <= expirationDate) {
          setShowModal(false);
          return;
        } else {
          setModalMessage('Tu suscripción cancelada ha expirado. Necesitas renovar para continuar.');
          setModalButtons('renew');
          setShowModal(true);
          return;
        }
      }

      // Usuario con problemas de pago
      if (session && userType === 'premium' && 
          (subscriptionStatus === 'Payment_Failed' || 
           subscriptionStatus === 'Grace_Period' || 
           subscriptionStatus === 'Suspended')) {
        setShowPaymentRecoveryModal(true);
        return;
      }
    }
  }, [session, userType, subscriptionStatus, loading, subscriptionData.subscription_expires_at]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Construir objeto de filtros solo con valores no vacíos
    const searchFilters: Record<string, string | number> = {};
    
    if (filters.title) searchFilters.title = filters.title;
    if (filters.content) searchFilters.content = filters.content;
    if (filters.author) searchFilters.author = filters.author;
    if (filters.category) searchFilters.category = filters.category;
    if (filters.date_from) searchFilters.date_from = filters.date_from;
    if (filters.date_to) searchFilters.date_to = filters.date_to;
    
    searchFilters.sort_by = filters.sort_by;
    searchFilters.sort_order = filters.sort_order;
    searchFilters.page = filters.page;
    searchFilters.limit = 20;

    search(searchFilters);
  };

  const handleClearFilters = () => {
    setFilters({
      title: '',
      content: '',
      author: '',
      category: '',
      date_from: '',
      date_to: '',
      sort_by: 'created_at',
      sort_order: 'desc',
      page: 1
    });
  };

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
    // Buscar automáticamente con la nueva página
    const searchFilters: Record<string, string | number> = {};
    if (filters.title) searchFilters.title = filters.title;
    if (filters.content) searchFilters.content = filters.content;
    if (filters.author) searchFilters.author = filters.author;
    if (filters.category) searchFilters.category = filters.category;
    if (filters.date_from) searchFilters.date_from = filters.date_from;
    if (filters.date_to) searchFilters.date_to = filters.date_to;
    searchFilters.sort_by = filters.sort_by;
    searchFilters.sort_order = filters.sort_order;
    searchFilters.page = newPage;
    searchFilters.limit = 20;
    search(searchFilters);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    router.push('/');
  };

  const handleGoToSubscription = () => {
    setShowModal(false);
    router.push('/suscripcion');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  return (
    <main className="p-6 max-w-7xl mx-auto">
      {/* Modal de Recovery de Pagos */}
      <PaymentRecoveryModal 
        isOpen={showPaymentRecoveryModal}
        onClose={() => setShowPaymentRecoveryModal(false)}
        subscriptionStatus={subscriptionStatus || ''}
        paymentRetryCount={subscriptionData.payment_retry_count}
        gracePeriodEnds={subscriptionData.grace_period_ends}
      />

      {/* Modal de protección */}
      <Modal isOpen={showModal} onClose={handleCloseModal}>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Acceso Restringido
          </h3>
          <p className="text-gray-600 mb-6">
            {modalMessage}
          </p>
          
          {modalButtons === 'subscription' && (
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleGoToSubscription}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md transition-colors"
              >
                Ver Suscripciones
              </button>
            </div>
          )}

          {modalButtons === 'renew' && (
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleGoToSubscription}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md transition-colors"
              >
                Renovar Suscripción
              </button>
            </div>
          )}

          <button
            onClick={handleCloseModal}
            className="mt-4 text-gray-500 hover:text-gray-700 text-sm"
          >
            Volver al inicio
          </button>
        </div>
      </Modal>

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link 
            href="/"
            className="text-blue-600 hover:text-blue-800 transition-colors"
          >
            ← Volver al inicio
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-gray-800">Buscar Artículos</h1>
        <p className="text-gray-600 mt-2">
          Encuentra contenido especializado en estética profesional
        </p>
      </div>

      {/* Formulario de búsqueda */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm mb-6">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Título */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Título
              </label>
              <input
                type="text"
                id="title"
                value={filters.title}
                onChange={(e) => setFilters(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Buscar por título..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Contenido */}
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                Contenido
              </label>
              <input
                type="text"
                id="content"
                value={filters.content}
                onChange={(e) => setFilters(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Palabras clave..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Autor */}
            <div>
              <label htmlFor="author" className="block text-sm font-medium text-gray-700 mb-2">
                Autor
              </label>
              <input
                type="text"
                id="author"
                value={filters.author}
                onChange={(e) => setFilters(prev => ({ ...prev, author: e.target.value }))}
                placeholder="Nombre o email del autor..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Categoría */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                Categoría
              </label>
              <select
                id="category"
                value={filters.category}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {categorias.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Fecha desde */}
            <div>
              <label htmlFor="date_from" className="block text-sm font-medium text-gray-700 mb-2">
                Fecha desde
              </label>
              <input
                type="date"
                id="date_from"
                value={filters.date_from}
                onChange={(e) => setFilters(prev => ({ ...prev, date_from: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Fecha hasta */}
            <div>
              <label htmlFor="date_to" className="block text-sm font-medium text-gray-700 mb-2">
                Fecha hasta
              </label>
              <input
                type="date"
                id="date_to"
                value={filters.date_to}
                onChange={(e) => setFilters(prev => ({ ...prev, date_to: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Ordenamiento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="sort_by" className="block text-sm font-medium text-gray-700 mb-2">
                Ordenar por
              </label>
              <select
                id="sort_by"
                value={filters.sort_by}
                onChange={(e) => setFilters(prev => ({ ...prev, sort_by: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="created_at">Fecha de creación</option>
                <option value="likes_count">Más populares</option>
                <option value="views_count">Más vistos</option>
                <option value="comments_count">Más comentados</option>
                <option value="title">Título</option>
              </select>
            </div>

            <div>
              <label htmlFor="sort_order" className="block text-sm font-medium text-gray-700 mb-2">
                Orden
              </label>
              <select
                id="sort_order"
                value={filters.sort_order}
                onChange={(e) => setFilters(prev => ({ ...prev, sort_order: e.target.value as 'asc' | 'desc' }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="desc">Descendente</option>
                <option value="asc">Ascendente</option>
              </select>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={searchLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {searchLoading ? 'Buscando...' : 'Buscar'}
            </button>
            <button
              type="button"
              onClick={handleClearFilters}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2 rounded-md transition-colors"
            >
              Limpiar Filtros
            </button>
          </div>
        </form>
      </div>

      {/* Error */}
      {searchError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600">{searchError}</p>
        </div>
      )}

      {/* Resultados */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        {results.total > 0 && (
          <div className="mb-4 text-gray-600">
            {results.total} {results.total === 1 ? 'resultado encontrado' : 'resultados encontrados'}
          </div>
        )}

        {results.posts.length === 0 && !searchLoading && (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No se encontraron resultados</h3>
            <p className="mt-2 text-gray-500">Intenta ajustar los filtros de búsqueda</p>
          </div>
        )}

        {/* Grid de resultados */}
        <div className="grid grid-cols-1 gap-6">
          {results.posts.map((post) => (
            <div key={post.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <Link href={`/post/${post.id}`}>
                <h3 className="text-xl font-semibold text-gray-800 hover:text-blue-600 mb-2 break-words">
                  {post.title}
                </h3>
              </Link>
              
              <p className="text-gray-600 mb-3 break-words">
                {truncateText(post.content, 150)}
              </p>

              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                {post.author && (
                  <span>
                    Por: <span className="font-medium">{post.author.full_name || post.author.email}</span>
                  </span>
                )}
                
                {post.category && (
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {categorias.find(c => c.value === post.category)?.label || post.category}
                  </span>
                )}
                
                <span>{formatDate(post.created_at)}</span>
                
                <span>👁️ {post.views_count}</span>
                <span>❤️ {post.likes_count}</span>
                <span>💬 {post.comments_count}</span>
              </div>

              <Link 
                href={`/post/${post.id}`}
                className="inline-block mt-3 text-blue-600 hover:text-blue-800 font-medium"
              >
                Leer más →
              </Link>
            </div>
          ))}
        </div>

        {/* Paginación */}
        {results.totalPages > 1 && (
          <div className="mt-6 flex justify-center gap-2">
            <button
              onClick={() => handlePageChange(filters.page - 1)}
              disabled={filters.page === 1}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            
            <span className="px-4 py-2">
              Página {filters.page} de {results.totalPages}
            </span>
            
            <button
              onClick={() => handlePageChange(filters.page + 1)}
              disabled={filters.page === results.totalPages}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Siguiente
            </button>
          </div>
        )}
      </div>
    </main>
  );
}