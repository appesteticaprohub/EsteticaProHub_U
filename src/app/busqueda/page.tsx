'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { useSearch } from '@/hooks/useSearch';
import Modal from '@/components/Modal';
import PaymentRecoveryModal from '@/components/PaymentRecoveryModal';
import SearchParamsWrapper from '@/components/SearchParamsWrapper';

function BusquedaPageContent({ searchParams }: { searchParams: URLSearchParams | null }) {
  const { session, userType, loading: authLoading } = useAuth();
  const { subscriptionStatus, subscriptionData, loading: statusLoading } = useSubscriptionStatus();
  const loading = authLoading || statusLoading;
  const router = useRouter();
  const { results, loading: searchLoading, error: searchError, search, clearResults } = useSearch();
  
  

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

  // 🆕 FUNCIÓN PARA DETECTAR CAMBIO DE PRECIO (MOVIDA AQUÍ)
  const checkPriceChangeAndSetMessage = async () => {
    try {
      // Obtener precio actual
      const priceResponse = await fetch('/api/subscription-price');
      const priceData = await priceResponse.json();
      const currentPrice = priceData.price;
      
      // Obtener último pago del usuario
      const statusResponse = await fetch('/api/subscription-status');
      const statusData = await statusResponse.json();
      const lastPayment = statusData.data.last_payment_amount || 0;
      
      // Determinar mensaje según cambio de precio
      if (lastPayment === null || lastPayment === 0) {
        // Usuario sin historial de pagos
        setModalMessage('Necesitas renovar tu suscripción para buscar');
      } else if (currentPrice !== lastPayment) {
        // Usuario con historial diferente al precio actual
        setModalMessage(`El precio ha cambiado de $${lastPayment} a $${currentPrice}. Renueva con el nuevo precio para buscar.`);
      } else {
        // Mismo precio
        setModalMessage('Necesitas renovar tu suscripción para buscar');
      }
      
      setModalButtons('renew');
      setShowModal(true);
      
    } catch (error) {
      console.error('Error detectando cambio de precio:', error);
      // Fallback al mensaje original
      setModalMessage('Necesitas renovar tu suscripción para buscar');
      setModalButtons('renew');
      setShowModal(true);
    }
  };

  // Estados para modales
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalButtons, setModalButtons] = useState<'subscription' | 'login' | 'renew'>('subscription');
  const [showPaymentRecoveryModal, setShowPaymentRecoveryModal] = useState(false);

  // Categorías (las mismas de crear-post)
  const categorias = [
    { value: '', label: 'Todas las categorías' },
    { value: 'casos-clinicos', label: 'Casos Clínicos' },
    { value: 'complicaciones', label: 'Complicaciones' },
    { value: 'tendencias-facial', label: 'Tendencias Facial' },
    { value: 'tendencias-corporal', label: 'Tendencias Corporal' },
    { value: 'tendencias-capilar', label: 'Tendencias Capilar' },
    { value: 'tendencias-spa', label: 'Tendencias Spa' },
    { value: 'gestion-empresarial', label: 'Gestión Empresarial' }
  ];

  // Validación de suscripción (igual que crear-post)
  useEffect(() => {
    if (!loading && !statusLoading) {
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

      // Usuario con estado Expired - detectar cambio de precio
      if (session && userType === 'premium' && subscriptionStatus === 'Expired') {
        // Verificar si hubo cambio de precio
        checkPriceChangeAndSetMessage();
        return;
      }

      // Usuario con estado Cancelled - verificar si aún tiene acceso
      if (session && userType === 'premium' && subscriptionStatus === 'Cancelled') {
        // ✅ Esperar a que subscriptionData esté completamente cargado
        if (!subscriptionData?.subscription_expires_at) {
          console.log('⏳ [BUSQUEDA] Esperando datos completos de suscripción...');
          return; // No hacer nada hasta que los datos estén listos
        }
        
        const now = new Date();
        const expirationDate = new Date(subscriptionData.subscription_expires_at);
        
        console.log('🔍 [BUSQUEDA] Usuario Cancelled - verificando acceso:', {
          ahora: now.toISOString(),
          expira: expirationDate.toISOString(),
          tieneAcceso: now <= expirationDate
        });
        
        if (now <= expirationDate) {
          // Aún tiene acceso hasta la fecha de expiración
          console.log('✅ [BUSQUEDA] Usuario Cancelled con acceso válido hasta:', expirationDate);
          setShowModal(false);
          return;
        } else {
          // Ya expiró el acceso
          console.log('❌ [BUSQUEDA] Usuario Cancelled sin acceso válido');
          setModalMessage('Tu suscripción cancelada ha expirado. Necesitas renovar para continuar.');
          setModalButtons('renew');
          setShowModal(true);
          return;
        }
      }

      // Usuario con estado Price_Change_Cancelled - verificar si aún tiene acceso
      if (session && userType === 'premium' && subscriptionStatus === 'Price_Change_Cancelled') {
        // ✅ Esperar a que subscriptionData esté completamente cargado
        if (!subscriptionData?.subscription_expires_at) {
          console.log('⏳ [BUSQUEDA] Esperando datos completos de suscripción Price_Change_Cancelled...');
          return; // No hacer nada hasta que los datos estén listos
        }
        
        const now = new Date();
        const expirationDate = new Date(subscriptionData.subscription_expires_at);
        
        console.log('🔍 [BUSQUEDA] Usuario Price_Change_Cancelled - verificando acceso:', {
          ahora: now.toISOString(),
          expira: expirationDate.toISOString(),
          tieneAcceso: now <= expirationDate
        });
        
        if (now <= expirationDate) {
          // Aún tiene acceso hasta la fecha de expiración
          console.log('✅ [BUSQUEDA] Usuario Price_Change_Cancelled con acceso válido hasta:', expirationDate);
          setShowModal(false);
          return;
        } else {
          // Ya expiró el acceso
          console.log('❌ [BUSQUEDA] Usuario Price_Change_Cancelled sin acceso válido');
          setModalMessage('Tu suscripción cancelada por cambio de precio ha expirado. Necesitas suscribirte con el nuevo precio para continuar.');
          setModalButtons('renew');
          setShowModal(true);
          return;
        }
      }

      // Usuario con problemas de pago - Payment_Failed y Grace_Period (sin verificar fecha)
      if (session && userType === 'premium' && 
          (subscriptionStatus === 'Payment_Failed' || 
          subscriptionStatus === 'Grace_Period')) {
        setShowPaymentRecoveryModal(true);
        return;
      }

      // Usuario con estado Suspended - verificar si aún tiene acceso
      if (session && userType === 'premium' && subscriptionStatus === 'Suspended') {
        // ✅ Esperar a que subscriptionData esté completamente cargado
        if (!subscriptionData?.subscription_expires_at) {
          console.log('⏳ [BUSQUEDA] Esperando datos completos de suscripción Suspended...');
          return; // No hacer nada hasta que los datos estén listos
        }
        
        const now = new Date();
        const expirationDate = new Date(subscriptionData.subscription_expires_at);
        
        console.log('🔍 [BUSQUEDA] Usuario Suspended - verificando acceso:', {
          ahora: now.toISOString(),
          expira: expirationDate.toISOString(),
          tieneAcceso: now <= expirationDate
        });
        
        if (now <= expirationDate) {
          // Aún tiene acceso hasta la fecha de expiración
          console.log('✅ [BUSQUEDA] Usuario Suspended con acceso válido hasta:', expirationDate);
          setShowModal(false);
          return;
        } else {
          // Ya expiró el acceso
          console.log('❌ [BUSQUEDA] Usuario Suspended sin acceso válido');
          setShowPaymentRecoveryModal(true);
          return;
        }
      }
    }
  }, [session, userType, subscriptionStatus, loading, statusLoading, subscriptionData?.subscription_expires_at]);

  // ✅ NUEVO: Detectar query parameters al cargar la página
  useEffect(() => {
    if (!searchParams) return;
    
    const categoryParam = searchParams.get('category');
    
    if (categoryParam && categoryParam !== filters.category) {
      // Actualizar el filtro de categoría
      setFilters(prev => ({ ...prev, category: categoryParam }));
      
      // Ejecutar búsqueda automáticamente si el usuario tiene acceso
      if (session && userType === 'premium' && subscriptionStatus === 'Active') {
        const searchFilters: Record<string, string | number> = {
          category: categoryParam,
          sort_by: 'created_at',
          sort_order: 'desc',
          page: 1,
          limit: 20
        };
        
        search(searchFilters);
      }
    }
  }, [searchParams, session, userType, subscriptionStatus, search, filters.category]);

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
    // ✅ NUEVO: Limpiar también los resultados mostrados
    clearResults();
  };

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
    
    // ✅ OPTIMIZACIÓN: Construir filtros más eficientemente
    const searchFilters: Record<string, string | number> = {
      sort_by: filters.sort_by,
      sort_order: filters.sort_order,
      page: newPage,
      limit: 20
    };
    
    // Solo agregar filtros que tienen valor
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== '' && key !== 'page' && key !== 'sort_by' && key !== 'sort_order') {
        searchFilters[key] = value;
      }
    });

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
        paypalSubscriptionId={subscriptionData.paypal_subscription_id}
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

      {/* Error */}
      {searchError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600">{searchError}</p>
        </div>
      )}

      {/* Resultados */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm mb-8">
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
          <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-sm text-gray-600">
              Mostrando {((filters.page - 1) * 20) + 1} a {Math.min(filters.page * 20, results.total)} de {results.total} resultados
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(filters.page - 1)}
                disabled={filters.page === 1 || searchLoading}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Anterior
              </button>
              
              {/* Números de página */}
              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, results.totalPages) }, (_, i) => {
                  const pageNum = filters.page <= 3 
                    ? i + 1 
                    : filters.page >= results.totalPages - 2 
                    ? results.totalPages - 4 + i 
                    : filters.page - 2 + i;
                  
                  if (pageNum < 1 || pageNum > results.totalPages) return null;
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      disabled={searchLoading}
                      className={`px-3 py-2 text-sm rounded-md transition-colors disabled:cursor-not-allowed ${
                        pageNum === filters.page
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => handlePageChange(filters.page + 1)}
                disabled={filters.page === results.totalPages || searchLoading}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Formulario de búsqueda */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
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
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {searchLoading && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {searchLoading ? 'Buscando...' : 'Buscar'}
            </button>
            <button
              type="button"
              onClick={handleClearFilters}
              disabled={searchLoading}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Limpiar Filtros
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

export default function BusquedaPage() {
  return (
    <SearchParamsWrapper>
      {(searchParams) => <BusquedaPageContent searchParams={searchParams} />}
    </SearchParamsWrapper>
  );
}