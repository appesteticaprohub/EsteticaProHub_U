'use client';

import { useState } from 'react';
import { Comment } from '@/types/api';
import Avatar from '@/components/Avatar';
import ReplyForm from './ReplyForm';
import ConfirmDeleteModal from '@/components/ConfirmDeleteModal';

// Función para calcular iniciales
function getInitials(fullName: string | null, email: string): string {
  if (fullName && fullName.trim()) {
    const words = fullName.trim().split(' ').filter(w => w.length > 0);
    if (words.length >= 2) {
      return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  }
  return email.substring(0, 2).toUpperCase();
}

interface CommentItemProps {
  comment: Comment;
  onReply: (commentId: string, content: string) => Promise<void>;
  onUpdate: (commentId: string, content: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  currentUserId: string | null;
  user: {
    id: string;
    email: string;
  } | null;
  hasValidAccess: () => boolean;
  isReply?: boolean;
  mainCommentId?: string;
}

export default function CommentItem({ 
  comment, 
  onReply, 
  onUpdate, 
  onDelete,
  currentUserId, 
  user, 
  hasValidAccess,
  isReply = false,
  mainCommentId
}: CommentItemProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  const userName = comment.profiles?.full_name || comment.profiles?.email || 'Usuario anónimo';
  const canReply = user && hasValidAccess() && !comment.is_deleted; // Todos los comentarios pueden recibir respuestas
  const canEdit = currentUserId === comment.user_id && hasValidAccess() && !comment.is_deleted;
  const canDelete = currentUserId === comment.user_id && hasValidAccess() && !comment.is_deleted;

  const handleReplyClick = () => {
    // Siempre mostrar formulario inline, sin importar el nivel
    setShowReplyForm(true);
    // Si es una respuesta, pre-rellenar con la mención
    if (isReply) {
      setReplyText(`@${userName} `);
    } else {
      setReplyText(`@${userName} `);
    }
  };

  const handleReplySubmit = async (content: string) => {
    setIsSubmittingReply(true);
    try {
      // Si es una respuesta, responder al comentario principal
      // Si es comentario principal, responder a sí mismo
      const targetCommentId = mainCommentId || comment.id;
      await onReply(targetCommentId, content);
      setShowReplyForm(false);
      setReplyText('');
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

  const handleEditClick = () => {
    setIsEditing(true);
    setEditText(comment.content);
  };

  const handleEditSubmit = async () => {
    if (!editText.trim()) {
      return;
    }
    setIsSubmittingEdit(true);
    try {
      await onUpdate(comment.id, editText.trim());
      setIsEditing(false);
    } catch (error) {
      console.error('Error submitting edit:', error);
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditText(comment.content);
  };

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(comment.id);
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Error deleting comment:', error);
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
  };

  return (
    <div className={`${isReply ? 'ml-8 md:ml-12 pl-4 border-l-2 border-gray-200' : ''}`}>
      <div className="flex items-start gap-3 py-3">
        <Avatar
          src={comment.profiles?.avatar_url || null}
          alt={userName}
          size={isReply ? 'sm' : 'md'}
          fallbackText={getInitials(comment.profiles?.full_name || null, comment.profiles?.email || 'user@example.com')}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
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
          
          {/* Contenido del comentario o formulario de edición */}
          {isEditing ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-2">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full p-2 border border-yellow-300 rounded resize-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-colors duration-200"
                rows={3}
                disabled={isSubmittingEdit}
                autoFocus
              />
              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={cancelEdit}
                  disabled={isSubmittingEdit}
                  className="px-3 py-1 text-xs text-gray-600 hover:text-gray-800 transition-colors duration-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleEditSubmit}
                  disabled={isSubmittingEdit || !editText.trim()}
                  className={`px-3 py-1 text-xs rounded transition-colors duration-200 ${
                    isSubmittingEdit || !editText.trim()
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                  }`}
                >
                  {isSubmittingEdit ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-gray-700 text-sm whitespace-pre-wrap break-words mb-2">
              {comment.content}
            </p>
          )}
          
          {/* Botones de acción */}
          {!isEditing && (
            <div className="flex items-center gap-3 flex-wrap">
              {canReply && (
                <button
                  onClick={handleReplyClick}
                  className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                >
                  Responder
                </button>
              )}
              {canEdit && (
                <button
                  onClick={handleEditClick}
                  className="text-yellow-600 hover:text-yellow-800 text-xs font-medium"
                >
                  Editar
                </button>
              )}
              {canDelete && (
                <button
                  onClick={handleDeleteClick}
                  disabled={isDeleting}
                  className={`text-red-600 hover:text-red-800 text-xs font-medium ${
                    isDeleting ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isDeleting ? 'Eliminando...' : 'Eliminar'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Formulario de respuesta inline */}
      {showReplyForm && (
        <div className={isReply ? '' : 'ml-11'}>
          <ReplyForm
            userName={userName}
            onSubmit={handleReplySubmit}
            onCancel={cancelReply}
            isSubmitting={isSubmittingReply}
            initialValue={replyText}
          />
        </div>
      )}
      
      {/* Modal de confirmación de eliminación */}
      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}