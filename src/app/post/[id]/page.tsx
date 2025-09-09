'use client';

import { use, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePost } from '@/hooks/usePost';
import { useAuth } from '@/contexts/AuthContext';
import { useAnonymousPostTracker } from '@/hooks/useAnonymousPostTracker';
import Modal from '@/components/Modal';

interface PostPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function PostPage({ params }: PostPageProps) {
  const resolvedParams = use(params);
  const { post, loading, error, incrementViews } = usePost(resolvedParams.id);
  const { user, userType, subscriptionStatus } = useAuth();
  const { viewedPostsCount, incrementViewedPosts, hasReachedLimit } = useAnonymousPostTracker();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<{
    title: string;
    message: string;
    primaryButton: string;
    primaryAction: () => void;
    secondaryButton?: string;
    secondaryAction?: () => void;
  } | null>(null);
  
  const router = useRouter();
  const hasIncrementedViews = useRef(false);
  const hasTrackedAnonymousView = useRef(false);

  const closeModal = () => {
    setIsModalOpen(false);
    setModalContent(null);
  };

  const goToSubscription = () => {
    console.log('Navegando a /suscripcion'); // Para debug
    router.push('/suscripcion');
  };

  const goToHome = () => {
    router.push('/');
  };

  // Verificar estado del usuario y mostrar modal correspondiente
  useEffect(() => {
    if (!loading && post) {
      // Usuario premium con suscripción expirada
      if (user && subscriptionStatus === 'Expired') {
        setModalContent({
          title: 'Suscripción Expirada',
          message: 'Tu suscripción ha expirado. Renueva ahora para continuar disfrutando del contenido premium.',
          primaryButton: 'Renovar Suscripción',
          primaryAction: () => {
            setIsModalOpen(false);
            router.push('/suscripcion');
          }
        });
        setIsModalOpen(true);
        return;
      }

      // Usuario premium cancelado
      if (user && subscriptionStatus === 'Cancelled') {
        setModalContent({
          title: 'Suscripción Cancelada',
          message: 'Tu suscripción ha sido cancelada. No cumples con las normas de este sitio.',
          primaryButton: 'Volver al Inicio',
          primaryAction: goToHome
        });
        setIsModalOpen(true);
        return;
      }

      // Usuario anónimo: trackear visualización
      if (!user && !hasTrackedAnonymousView.current) {
        incrementViewedPosts();
        hasTrackedAnonymousView.current = true;
      }
    }
  }, [loading, post, user, subscriptionStatus]);

  // Incrementar vistas cuando el post se carga exitosamente (solo una vez)
  useEffect(() => {
    if (post && !loading && !error && !hasIncrementedViews.current) {
      incrementViews(resolvedParams.id);
      hasIncrementedViews.current = true;
    }
  }, [post, loading, error, incrementViews, resolvedParams.id]);

  // Funciones para truncar contenido
  const getTruncatedContent = (content: string, lines: number = 4) => {
    const contentLines = content.split('\n');
    if (contentLines.length <= lines) {
      return content;
    }
    return contentLines.slice(0, lines).join('\n');
  };

  const shouldShowTruncatedContent = () => {
  return !user && viewedPostsCount > 1;
};

  if (loading) {
    return (
      <main className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h1 className="text-lg font-semibold text-red-800 mb-2">Error</h1>
            <p className="text-red-600">{error}</p>
          </div>
        </div>
      </main>
    );
  }

  if (!post) {
    return (
      <main className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-8">
            <h1 className="text-2xl font-semibold text-gray-600">Post no encontrado</h1>
          </div>
        </div>
      </main>
    );
  }

  const contentToShow = shouldShowTruncatedContent() 
    ? getTruncatedContent(post.content) 
    : post.content;

  return (
    <main className="p-6">
      <div className="max-w-4xl mx-auto">
        <article className="bg-white rounded-lg shadow-sm border p-8">
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {post.title}
            </h1>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>
                {new Date(post.created_at).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
          </header>
          
          <div className="prose prose-lg max-w-none">
            {shouldShowTruncatedContent() ? (
              <div className="relative">
                <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                  {contentToShow}
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white via-white/95 to-transparent pointer-events-none"></div>
              </div>
            ) : (
              <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                {contentToShow}
              </div>
            )}
            
            {/* Call-to-action para usuarios anónimos que han alcanzado el límite */}
            {shouldShowTruncatedContent() && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 text-center mt-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  ¿Quieres ver el contenido completo?
                </h3>
                <p className="text-gray-600 mb-4">
                  Suscríbete ahora y accede a todo nuestro contenido premium sin límites.
                </p>
                <button
                  onClick={goToSubscription}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
                >
                  Suscribirse Ahora
                </button>
              </div>
            )}
          </div>
          
          <footer className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex items-center gap-6 text-sm text-gray-600 mb-4">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span>{post.views_count} vistas</span>
              </div>
              
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <span>{post.likes_count} likes</span>
              </div>
              
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.97 8.97 0 01-4.906-1.435l-3.657 1.218a.5.5 0 01-.65-.65l1.218-3.657A8.97 8.97 0 013 12a8 8 0 018-8c4.418 0 8 3.582 8 8z" />
                </svg>
                <span>{post.comments_count} comentarios</span>
              </div>
            </div>
            
            {/* Botones de interacción siempre visibles */}
            <div className="flex items-center gap-4">
              <button
                className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors duration-200 border border-red-200 hover:border-red-300"
              >
                <span className="text-lg">❤️</span>
                <span className="text-sm font-medium">Me gusta</span>
              </button>
              
              <button
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors duration-200 border border-blue-200 hover:border-blue-300"
              >
                <span className="text-lg">💬</span>
                <span className="text-sm font-medium">Comentar</span>
              </button>
            </div>
          </footer>
        </article>
      </div>

      {/* Modal dinámico */}
      {modalContent && (
        <Modal isOpen={isModalOpen} onClose={closeModal}>
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
              <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {modalContent.title}
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              {modalContent.message}
            </p>
            <div className="flex gap-3 justify-center">
              {modalContent.secondaryButton && modalContent.secondaryAction && (
                <button
                  onClick={modalContent.secondaryAction}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
                >
                  {modalContent.secondaryButton}
                </button>
              )}
              <button
                onClick={modalContent.primaryAction}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors duration-200"
              >
                {modalContent.primaryButton}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </main>
  );
}