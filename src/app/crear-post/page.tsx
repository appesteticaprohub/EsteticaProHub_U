'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import Modal from '@/components/Modal';
import PaymentRecoveryModal from '@/components/PaymentRecoveryModal';
import { createPost } from '@/lib/supabase';

// Tipo para la respuesta del post creado
interface CreatedPost {
  id: string;
  title: string;
  content: string;
  category: string;
  author_id: string;
  created_at: string;
  updated_at: string;
  views_count: number;
  likes_count: number;
  comments_count: number;
}

export default function CrearPost() {
  const { user, session, userType, loading: authLoading } = useAuth();
  const { subscriptionStatus, subscriptionData, loading: statusLoading } = useSubscriptionStatus();
  const loading = authLoading || statusLoading;
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalButtons, setModalButtons] = useState<'subscription' | 'login' | 'renew' | 'cancelled'>('subscription');
  const [showPaymentRecoveryModal, setShowPaymentRecoveryModal] = useState(false);
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

  useEffect(() => {
    if (!loading) {
      // Situación 1: Usuario anónimo o sin sesión
      if (!session || userType === 'anonymous') {
        setModalMessage('Necesitas una suscripción');
        setModalButtons('subscription');
        setShowModal(true);
        return;
      }

      // Situación 2: Usuario premium con estado Active y logueado - puede crear post
      if (session && userType === 'premium' && subscriptionStatus === 'Active') {
        setShowModal(false);
        return;
      }

      // Situación 3: Usuario premium con estado Expired (middleware ya actualizó si era necesario)
      if (session && userType === 'premium' && subscriptionStatus === 'Expired') {
        setModalMessage('Necesitas renovar tu suscripción');
        setModalButtons('renew');
        setShowModal(true);
        return;
      }

      // Situación 4: Usuario premium con estado Cancelled
      if (session && userType === 'premium' && subscriptionStatus === 'Cancelled') {
        setModalMessage('Tu suscripción ha sido cancelada por violar las normas de este sitio');
        setModalButtons('cancelled');
        setShowModal(true);
        return;
      }

      // Situación 5: Usuario con problemas de pago
      if (session && userType === 'premium' && 
          (subscriptionStatus === 'Payment_Failed' || 
           subscriptionStatus === 'Grace_Period' || 
           subscriptionStatus === 'Suspended')) {
        setShowPaymentRecoveryModal(true);
        return;
      }
    }
  }, [session, userType, subscriptionStatus, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!user) {
    console.error('Usuario no autenticado');
    return;
  }

  try {
    const { data, error } = await createPost({
      title: titulo,
      content: contenido,
      category: categoria,
      authorId: user.id
    }) as { data: CreatedPost | null; error: string | null };

    if (error) {
      console.error('Error al crear el post:', error);
      return;
    }

    if (data) {
      // Redirigir al post creado
      router.push(`/post/${data.id}`);
    }
  } catch (error) {
    console.error('Error inesperado:', error);
  }
};

  const handleCloseModal = () => {
    setShowModal(false);
    // Redirigir al inicio después de cerrar el modal
    router.push('/');
  };

  const handleGoToLogin = () => {
    setShowModal(false);
    router.push('/login');
  };

  const handleGoToSubscription = () => {
    setShowModal(false);
    router.push('/suscripcion');
  };

  // Mostrar contenido directamente, el modal se maneja por estado
  return (
    <main className="p-6 max-w-4xl mx-auto">
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
          
          {/* Botones según el tipo de situación */}
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

          {modalButtons === 'cancelled' && (
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleGoToSubscription}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-md transition-colors"
              >
                Contactar Soporte
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