import { createServerSupabaseAdminClient } from './server-supabase'

interface CreateSocialNotificationParams {
  recipientUserId: string;
  actorUserId: string;
  actorName: string;
  type: 'comment' | 'like' | 'reply';
  postId: string;
  postTitle?: string;
  commentId?: string;
}

export async function createSocialNotification(params: CreateSocialNotificationParams) {
  const {
    recipientUserId,
    actorUserId,
    actorName,
    type,
    postId,
    postTitle,
    commentId
  } = params

  // No enviar notificación si el actor es el mismo que el receptor
  if (recipientUserId === actorUserId) {
    return { success: true, skipped: true }
  }

  try {
    const supabase = createServerSupabaseAdminClient()

    // Verificar preferencias del usuario
    const { data: preferences } = await supabase
      .from('notification_preferences')
      .select('in_app_notifications')
      .eq('user_id', recipientUserId)
      .single()

    // Si tiene preferencias y tiene desactivadas las notificaciones in-app, no enviar
    if (preferences && !preferences.in_app_notifications) {
      return { success: true, skipped: true }
    }

    let title = ''
    let message = ''
    let ctaUrl = ''

    switch (type) {
      case 'comment':
        title = 'Nuevo comentario en tu post'
        message = `${actorName} comentó en tu post${postTitle ? `: "${postTitle}"` : ''}`
        ctaUrl = `/post/${postId}`
        break

      case 'like':
        title = 'Le gustó tu post'
        message = `A ${actorName} le gustó tu post${postTitle ? `: "${postTitle}"` : ''}`
        ctaUrl = `/post/${postId}`
        break

      case 'reply':
        title = 'Nueva respuesta a tu comentario'
        message = `${actorName} respondió a tu comentario${postTitle ? ` en: "${postTitle}"` : ''}`
        ctaUrl = commentId ? `/post/${postId}#comment-${commentId}` : `/post/${postId}`
        break
    }

    // Crear notificación in-app
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: recipientUserId,
        type: 'in_app',
        category: 'normal',
        title,
        message,
        cta_text: 'Ver',
        cta_url: ctaUrl,
        is_read: false,
        expires_at: null,
        created_by_admin_id: null
      })
      .select()

    if (error) {
      console.error('Error creating social notification:', error)
      return { success: false, error: error.message }
    }

    return { success: true, skipped: false }

  } catch (error) {
    console.error('Error in createSocialNotification:', error)
    return { success: false, error: 'Error interno al crear notificación' }
  }
}