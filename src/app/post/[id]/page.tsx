'use client';

import { use, useEffect, useRef, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { usePost } from '@/hooks/usePost';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import PaymentRecoveryModal from '@/components/PaymentRecoveryModal';
import { useAnonymousPostTracker } from '@/hooks/useAnonymousPostTracker';
import Modal from '@/components/Modal';
import SnackBar from '@/components/Snackbar';
import { useLikes } from '@/hooks/useLikes';
import { useCommentsWithActions } from '@/hooks/useComments';
import { Comment } from '@/types/api';
import ImageGallery from '@/components/ImageGallery';
import Avatar from '@/components/Avatar';
import PostHero from '@/components/PostDetail/PostHero';
import CommentSection from '@/components/PostDetail/CommentSection';

interface PostPageProps {
  params: Promise<{
    id: string;
  }>;
}


export default function PostPage({ params }: PostPageProps) {
  const resolvedParams = use(params);
  const { post, loading, error, incrementViews } = usePost(resolvedParams.id);
  const { user } = useAuth();
  const { subscriptionStatus, subscriptionData } = useSubscriptionStatus();
  const expirationDate = useMemo(() => {
    return subscriptionData?.subscription_expires_at ? new Date(subscriptionData.subscription_expires_at) : null;
  }, [subscriptionData?.subscription_expires_at]);
  const { viewedPostsCount, incrementViewedPosts, limit } = useAnonymousPostTracker();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { isLiked, likesCount, loading: likesLoading, toggleLike } = useLikes(resolvedParams.id);
  
  // Memorizar datos del autor para evitar pérdida en re-renders
  const { comments, loading: commentsLoading, error: commentsError, hasMore, loadMore, isLoadingMore, createComment, updateComment, deleteComment } = useCommentsWithActions(resolvedParams.id);
  const [showSnackBar, setShowSnackBar] = useState(false);
  const [snackBarMessage, setSnackBarMessage] = useState('');
  const [showPaymentRecoveryModal, setShowPaymentRecoveryModal] = useState(false);
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

  const handleLikeClick = async () => {
    const result = await toggleLike();
    if (result && result.showSnackBar && result.message) {
      setSnackBarMessage(result.message);
      setShowSnackBar(true);
    }
  };

  const hideSnackBar = () => {
    setShowSnackBar(false);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalContent(null);
  };

  const goToSubscription = () => {
    console.log('Navegando a /suscripcion'); // Para debug
    router.push('/suscripcion');
  };

  // Verificar estado del usuario y mostrar modal correspondiente
  useEffect(() => {
    if (!loading && post) {
      // Usuario premium con suscripción expirada (middleware ya actualizó si era necesario)
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

      // Usuario premium cancelado - verificar si aún tiene acceso
      if (user && subscriptionStatus === 'Cancelled') {
        const now = new Date();
        const expirationDate = subscriptionData.subscription_expires_at ? new Date(subscriptionData.subscription_expires_at) : null;
        
        if (expirationDate && now <= expirationDate) {
          // Aún tiene acceso hasta la fecha de expiración - no mostrar modal
          setIsModalOpen(false);
          setModalContent(null);
        } else {
          // Ya expiró el acceso
          setModalContent({
            title: 'Suscripción Cancelada Expirada',
            message: 'Tu suscripción cancelada ha expirado. Renueva ahora para continuar accediendo al contenido premium.',
            primaryButton: 'Renovar Suscripción',
            primaryAction: () => {
              setIsModalOpen(false);
              router.push('/suscripcion');
            }
          });
          setIsModalOpen(true);
        }
        return;
      }

      // Usuario con problemas de pago - mostrar modal de recovery
      if (user && (subscriptionStatus === 'Payment_Failed' || 
                   subscriptionStatus === 'Grace_Period' || 
                   subscriptionStatus === 'Suspended')) {
        setShowPaymentRecoveryModal(true);
        return;
      }

      // Usuario anónimo: trackear visualización
      if (!user && !hasTrackedAnonymousView.current) {
        incrementViewedPosts();
        hasTrackedAnonymousView.current = true;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, post, user, subscriptionStatus, expirationDate]);

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
  return !user && viewedPostsCount > limit;
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
        <article className="bg-white rounded-lg shadow-sm p-8">
          <PostHero
            title={post.title}
            author={post.author}
            createdAt={post.created_at}
            subscriptionStatus={user ? subscriptionStatus : null}
            onResolvePayment={() => setShowPaymentRecoveryModal(true)}
          />
          
          <div className="prose prose-lg max-w-none">
            {shouldShowTruncatedContent() ? (
              <div className="relative">
                <div className="whitespace-pre-wrap text-gray-800 leading-relaxed break-words overflow-wrap-anywhere">
                  {contentToShow}
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white via-white/95 to-transparent pointer-events-none"></div>
              </div>
            ) : (
              <div className="whitespace-pre-wrap text-gray-800 leading-relaxed break-words overflow-wrap-anywhere">
                {contentToShow}
              </div>
            )}

            {/* Galería de imágenes */}
            {post.images && post.images.length > 0 && !shouldShowTruncatedContent() && (
              <div className="mt-8">
                <ImageGallery images={post.images} alt={post.title} />
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
          {/* Estadísticas con iconos coloreados */}
          <div className="flex items-center gap-6 mb-4">
            {/* Vistas - Negro */}
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span className="text-sm font-normal text-gray-900">{post.views_count}</span>
            </div>
            
            {/* Likes - Dinámico según estado */}
            <div className="flex items-center gap-2">
              {isLiked ? (
                <svg className="w-4 h-4 text-red-600" fill="currentColor" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              )}
              <span className={`text-sm font-normal ${isLiked ? 'text-red-600' : 'text-gray-900'}`}>{likesCount}</span>
            </div>
            
            {/* Comentarios - Negro */}
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.97 8.97 0 01-4.906-1.435l-3.657 1.218a.5.5 0 01-.65-.65l1.218-3.657A8.97 8.97 0 013 12a8 8 0 018-8c4.418 0 8 3.582 8 8z" />
              </svg>
              <span className="text-sm font-normal text-gray-900">{post.comments_count}</span>
            </div>
          </div>
          
          {/* Botones de interacción siempre visibles */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleLikeClick}
              disabled={likesLoading}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors duration-200 border ${
                isLiked 
                  ? 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200 hover:border-red-300' 
                  : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200 hover:border-gray-300'
              } ${likesLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isLiked ? (
                <svg className="w-5 h-5 text-red-600" fill="currentColor" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              )}
              <span className="text-sm font-medium">
                {likesLoading ? 'Cargando...' : 'Me gusta'}
              </span>
            </button>
          </div>
        </footer>
        </article>

        {/* Sección de comentarios */}
        <CommentSection
          comments={comments}
          commentsCount={post.comments_count}
          loading={commentsLoading}
          error={commentsError}
          hasMore={hasMore}
          isLoadingMore={isLoadingMore || false}
          onLoadMore={loadMore}
          onCreateComment={createComment}
          onReply={async (commentId: string, content: string) => {
            if (!user || subscriptionStatus !== 'Active') {
              setSnackBarMessage('Necesitas una suscripción');
              setShowSnackBar(true);
              throw new Error('Sin suscripción');
            }
            try {
              const result = await createComment(content, commentId);
              if (result.error) {
                setSnackBarMessage(`Error: ${result.error}`);
                setShowSnackBar(true);
                throw new Error(result.error);
              } else {
                setSnackBarMessage('Respuesta agregada exitosamente');
                setShowSnackBar(true);
              }
            } catch (error) {
              setSnackBarMessage('Error al enviar respuesta');
              setShowSnackBar(true);
              throw error;
            }
          }}
          onUpdate={async (commentId: string, content: string) => {
            if (!user || subscriptionStatus !== 'Active') {
              setSnackBarMessage('Necesitas una suscripción');
              setShowSnackBar(true);
              throw new Error('Sin suscripción');
            }
            try {
              const result = await updateComment(commentId, content, resolvedParams.id);
              if (result.error) {
                setSnackBarMessage(`Error: ${result.error}`);
                setShowSnackBar(true);
                throw new Error(result.error);
              } else {
                setSnackBarMessage('Comentario actualizado exitosamente');
                setShowSnackBar(true);
              }
            } catch (error) {
              setSnackBarMessage('Error al actualizar comentario');
              setShowSnackBar(true);
              throw error;
            }
          }}
          onDelete={async (commentId: string) => {
            if (!user || subscriptionStatus !== 'Active') {
              setSnackBarMessage('Necesitas una suscripción');
              setShowSnackBar(true);
              throw new Error('Sin suscripción');
            }
            try {
              const result = await deleteComment(commentId, resolvedParams.id);
              if (result.error) {
                setSnackBarMessage(`Error: ${result.error}`);
                setShowSnackBar(true);
                throw new Error(result.error);
              } else {
                setSnackBarMessage('Comentario eliminado exitosamente');
                setShowSnackBar(true);
              }
            } catch (error) {
              setSnackBarMessage('Error al eliminar comentario');
              setShowSnackBar(true);
              throw error;
            }
          }}
          currentUserId={user?.id || null}
          user={user}
          subscriptionStatus={subscriptionStatus}
          onShowSnackBar={(message: string) => {
            setSnackBarMessage(message);
            setShowSnackBar(true);
          }}
        />
      </div>
      {/* Modal de Recovery de Pagos */}
      <PaymentRecoveryModal 
        isOpen={showPaymentRecoveryModal}
        onClose={() => setShowPaymentRecoveryModal(false)}
        subscriptionStatus={subscriptionStatus || ''}
        paymentRetryCount={subscriptionData.payment_retry_count}
        gracePeriodEnds={subscriptionData.grace_period_ends}
      />
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
      {/* SnackBar para notificaciones */}
      <SnackBar 
        message={snackBarMessage}
        isVisible={showSnackBar}
        onHide={hideSnackBar}
      />
    </main>
  );
}