'use client';

import { use, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePost } from '@/hooks/usePost';
import { useAuth } from '@/contexts/AuthContext';
import { useAnonymousPostTracker } from '@/hooks/useAnonymousPostTracker';
import Modal from '@/components/Modal';
import SnackBar from '@/components/Snackbar';
import { useLikes } from '@/hooks/useLikes';
import { useComments } from '@/hooks/useComments';
import { useCommentsWithActions } from '@/hooks/useComments';
import { Comment } from '@/types/api';


interface PostPageProps {
  params: Promise<{
    id: string;
  }>;
}

interface CommentItemProps {
  comment: Comment;
  onReply: (commentId: string, content: string) => Promise<void>;
  user: any;
  subscriptionStatus: string | null;
  level?: number;
}

function CommentItem({ comment, onReply, user, subscriptionStatus, level = 0 }: CommentItemProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  
  const userName = comment.profiles?.full_name || comment.profiles?.email || 'Usuario anónimo';
  const canReply = user && subscriptionStatus === 'Active';

  const handleReplyClick = () => {
    setShowReplyForm(true);
    setReplyText(`@${userName} `);
  };

  const handleReplySubmit = async () => {
    if (!replyText.trim()) {
      return;
    }
    setIsSubmittingReply(true);
    try {
      await onReply(comment.id, replyText.trim());
      setReplyText('');
      setShowReplyForm(false);
    } catch (error) {
      console.error('Error submitting reply:', error);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const cancelReply = () => {
    setShowReplyForm(false);
    setReplyText('');
  };

  return (
    <div className={`${level > 0 ? 'ml-8 mt-4' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
          {userName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-medium text-gray-900">
              {userName}
            </h4>
            <span className="text-xs text-gray-500">
              {new Date(comment.created_at).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'America/Bogota'
              })}
            </span>
          </div>
          <p className="text-gray-700 text-sm whitespace-pre-wrap break-words mb-2">
            {comment.content}
          </p>
          {canReply && (
            <button
              onClick={handleReplyClick}
              className="text-blue-600 hover:text-blue-800 text-xs font-medium"
            >
              Responder
            </button>
          )}
        </div>
      </div>
      
      {/* Formulario de respuesta inline */}
      {showReplyForm && (
        <div className="mt-3 ml-11 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-sm font-medium text-blue-900">
              Respondiendo a {userName}
            </h4>
            <button
              onClick={cancelReply}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Cancelar
            </button>
          </div>
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder={`Responder a ${userName}...`}
            className="w-full p-3 border border-blue-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
            rows={3}
            disabled={isSubmittingReply}
            autoFocus
          />
          <div className="flex justify-end mt-3">
            <button
              onClick={handleReplySubmit}
              disabled={isSubmittingReply || !replyText.trim()}
              className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
                isSubmittingReply || !replyText.trim()
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isSubmittingReply ? 'Enviando...' : 'Responder'}
            </button>
          </div>
        </div>
      )}
      
      {/* Mostrar respuestas anidadas */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-4">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              onReply={onReply}
              user={user}
              subscriptionStatus={subscriptionStatus}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function PostPage({ params }: PostPageProps) {
  const resolvedParams = use(params);
  const { post, loading, error, incrementViews } = usePost(resolvedParams.id);
  const { user, userType, subscriptionStatus } = useAuth();
  const { viewedPostsCount, incrementViewedPosts, hasReachedLimit } = useAnonymousPostTracker();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { isLiked, likesCount, loading: likesLoading, toggleLike } = useLikes(resolvedParams.id);
  const { comments, loading: commentsLoading, error: commentsError, createComment } = useCommentsWithActions(resolvedParams.id);
  const [showSnackBar, setShowSnackBar] = useState(false);
  const [snackBarMessage, setSnackBarMessage] = useState('');
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
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

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

  const handleCommentSubmit = async () => {
  // Validar contenido
  if (!commentText.trim()) {
    setSnackBarMessage('Por favor escribe un comentario');
    setShowSnackBar(true);
    return;
  }

  // Situación 1: Usuario anónimo o sin suscripción activa
  if (!user || subscriptionStatus !== 'Active') {
    setSnackBarMessage('Necesitas una suscripción');
    setShowSnackBar(true);
    return;
  }

  // Situación 2: Usuario premium activo - crear comentario
  setIsSubmittingComment(true);
  
  try {
    const result = await createComment(commentText.trim());
    
    if (result.error) {
      setSnackBarMessage(`Error: ${result.error}`);
      setShowSnackBar(true);
    } else {
      // Limpiar el formulario
      setCommentText('');
      // Opcional: mostrar mensaje de éxito
      setSnackBarMessage('Comentario agregado exitosamente');
      setShowSnackBar(true);
    }
  } catch (error) {
    setSnackBarMessage('Error al enviar comentario');
    setShowSnackBar(true);
  } finally {
    setIsSubmittingComment(false);
  }
};

const handleCreateReply = async (commentId: string, content: string) => {
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
};


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
                <span>{likesCount} likes</span>
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
                onClick={handleLikeClick}
                disabled={likesLoading}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors duration-200 border ${
                  isLiked 
                    ? 'bg-red-100 hover:bg-red-200 text-red-700 border-red-300 hover:border-red-400' 
                    : 'bg-red-50 hover:bg-red-100 text-red-600 border-red-200 hover:border-red-300'
                } ${likesLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span className="text-lg">❤️</span>
                <span className="text-sm font-medium">
                  {likesLoading ? 'Cargando...' : 'Me gusta'}
                </span>
              </button>
            </div>
          </footer>
        </article>

        {/* Sección de comentarios */}
        <section className="bg-white rounded-lg shadow-sm border mt-6 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Comentarios ({post.comments_count})
          </h2>

          {/* Formulario para agregar comentarios */}
          <div className="mb-8 border-b border-gray-200 pb-6">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Escribe tu comentario..."
              className="w-full p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
              rows={3}
              disabled={isSubmittingComment}
            />
            <div className="flex justify-end mt-3">
              <button
                onClick={handleCommentSubmit}
                disabled={isSubmittingComment || !commentText.trim()}
                className={`px-6 py-2 rounded-lg font-medium transition-colors duration-200 ${
                  isSubmittingComment || !commentText.trim()
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isSubmittingComment ? 'Enviando...' : 'Comentar'}
              </button>
            </div>
          </div>
          
          {commentsLoading && (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {commentsError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600 text-sm">Error al cargar comentarios: {commentsError}</p>
            </div>
          )}
          
          {!commentsLoading && !commentsError && comments.length === 0 && (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-2">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.97 8.97 0 01-4.906-1.435l-3.657 1.218a.5.5 0 01-.65-.65l1.218-3.657A8.97 8.97 0 013 12a8 8 0 018-8c4.418 0 8 3.582 8 8z" />
                </svg>
              </div>
              <p className="text-gray-500">No hay comentarios aún</p>
              <p className="text-gray-400 text-sm">Sé el primero en comentar</p>
            </div>
          )}
          
          {!commentsLoading && !commentsError && comments.length > 0 && (
          <div className="space-y-6">
            {comments.map((comment) => (
              <CommentItem 
                key={comment.id} 
                comment={comment} 
                onReply={handleCreateReply}
                user={user}
                subscriptionStatus={subscriptionStatus}
              />
            ))}
          </div>
        )}
        </section>
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
      {/* SnackBar para notificaciones */}
      <SnackBar 
        message={snackBarMessage}
        isVisible={showSnackBar}
        onHide={hideSnackBar}
      />
    </main>
  );
}