'use client';

import { useState, useRef } from 'react';
import CommentItem from './CommentItem';
import { Comment } from '@/types/api';


interface CommentSectionProps {
  comments: Comment[];
  commentsCount: number;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  onCreateComment: (content: string) => Promise<{ data: Comment | null; error: string | null }>;
  onReply: (commentId: string, content: string) => Promise<void>;
  onUpdate: (commentId: string, content: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  currentUserId: string | null;
  user: {
    id: string;
    email: string;
  } | null;
  subscriptionStatus: string | null;
  hasValidAccess: () => boolean;
  onShowSnackBar: (message: string) => void;
}

export default function CommentSection({
  comments,
  commentsCount,
  loading,
  error,
  hasMore,
  isLoadingMore,
  onLoadMore,
  onCreateComment,
  onReply,
  onUpdate,
  onDelete,
  currentUserId,
  user,
  subscriptionStatus,
  hasValidAccess,
  onShowSnackBar
}: CommentSectionProps) {
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [collapsedComments, setCollapsedComments] = useState<Set<string>>(new Set());
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  

  const handleCommentSubmit = async () => {
    // Validar contenido
    if (!commentText.trim()) {
      onShowSnackBar('Por favor escribe un comentario');
      return;
    }

    // Situación 1: Usuario anónimo o sin suscripción activa
    if (!user || !hasValidAccess()) {
      onShowSnackBar('Necesitas una suscripción');
      return;
    }

    // Situación 2: Usuario premium activo - crear comentario
    setIsSubmittingComment(true);
    
    try {
      const result = await onCreateComment(commentText.trim());
      
      if (result.error) {
        onShowSnackBar(`Error: ${result.error}`);
      } else {
        // Limpiar el formulario
        setCommentText('');
        // Mensaje de éxito
        onShowSnackBar('Comentario agregado exitosamente');
      }
    } catch {
      onShowSnackBar('Error al enviar comentario');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Función para obtener respuestas de un comentario principal
  const getReplies = (commentId: string) => {
    return comments.filter(comment => comment.parent_id === commentId);
  };

  const toggleCollapse = (commentId: string) => {
    setCollapsedComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  // Separar comentarios principales de respuestas
  const mainComments = comments.filter(comment => !comment.parent_id);


  return (
    <section className="bg-white rounded-lg shadow-sm border mt-6 p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">
        Comentarios ({commentsCount})
      </h2>

      {/* Formulario para agregar comentarios */}
      <div className="mb-8 border-b border-gray-200 pb-6">
        <textarea
          ref={textareaRef}
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
      
      {loading && (
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
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 text-sm">Error al cargar comentarios: {error}</p>
        </div>
      )}
      
      {!loading && !error && comments.length === 0 && (
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.97 8.97 0 01-4.906-1.435l-3.657 1.218a.5.5 0 01-.65-.65l1.218-3.657A8.97 8.97 0 013 12a8 8 0 018-8c4.418 0 8 3.582 8 8z" />
            </svg>
          </div>
          <p className="text-gray-500">No hay comentarios aún</p>
          <p className="text-gray-400 text-sm">Sé el primero en comentar</p>
        </div>
      )}
      
      {!loading && !error && mainComments.length > 0 && (
        <div className="space-y-4">
          {mainComments.map((comment) => {
            const replies = getReplies(comment.id);
            const isCollapsed = collapsedComments.has(comment.id);
            const hasReplies = replies.length > 0;

            return (
              <div key={comment.id} className="border-b border-gray-100 last:border-b-0 pb-4 last:pb-0">
                {/* Comentario Principal */}
                <CommentItem
                  comment={comment}
                  onReply={onReply}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  currentUserId={currentUserId}
                  user={user}
                  subscriptionStatus={subscriptionStatus}
                  hasValidAccess={hasValidAccess}
                  isReply={false}
                />
                
                {/* Respuestas */}
                {hasReplies && (
                  <div className="mt-2">
                    {/* Botón para colapsar/expandir respuestas */}
                    <button
                      onClick={() => toggleCollapse(comment.id)}
                      className="ml-11 text-blue-600 hover:text-blue-800 text-xs font-medium flex items-center gap-1 mb-2"
                    >
                      {isCollapsed ? (
                        <>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                          Ver {replies.length} {replies.length === 1 ? 'respuesta' : 'respuestas'}
                        </>
                      ) : (
                        <>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                          Ocultar {replies.length} {replies.length === 1 ? 'respuesta' : 'respuestas'}
                        </>
                      )}
                    </button>
                    
                    {/* Mostrar respuestas si no está colapsado */}
                    {!isCollapsed && (
                      <div className="space-y-0">
                        {replies.map((reply) => (
                          <CommentItem
                            key={reply.id}
                            comment={reply}
                            onReply={onReply}
                            onUpdate={onUpdate}
                            onDelete={onDelete}
                            currentUserId={currentUserId}
                            user={user}
                            subscriptionStatus={subscriptionStatus}
                            hasValidAccess={hasValidAccess}
                            isReply={true}
                            mainCommentId={comment.id}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          
          {/* Botón Cargar Más */}
          {hasMore && (
            <div className="flex justify-center pt-6 border-t border-gray-200">
              <button
                onClick={onLoadMore}
                disabled={isLoadingMore}
                className={`px-6 py-3 rounded-lg font-medium transition-colors duration-200 ${
                  isLoadingMore
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isLoadingMore ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Cargando...
                  </span>
                ) : (
                  'Cargar más comentarios'
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}