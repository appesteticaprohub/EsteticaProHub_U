import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/server-supabase'
import { Comment } from '@/types/api'
import { createSocialNotification, createMentionNotifications } from '@/lib/social-notification-service'

// Función para extraer menciones del contenido
function extractMentions(content: string): string[] {
  // Regex mejorada: captura @Nombre o @Nombre Apellido (máximo 2 palabras)
  // Se detiene en espacios múltiples, puntuación o fin de línea
  const mentionRegex = /@([A-Za-zÀ-ÿ\u00f1\u00d1]+(?:\s+[A-Za-zÀ-ÿ\u00f1\u00d1]+)?)/g
  const mentions: string[] = []
  let match

  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1].trim())
  }

  return mentions
}

// Función para obtener IDs de usuarios por nombres
async function getUserIdsByNames(names: string[], supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>): Promise<string[]> {
  if (names.length === 0) return []

  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .or(names.map(name => `full_name.ilike.%${name}%`).join(','))

  if (error || !data) {
    console.error('Error fetching user IDs by names:', error)
    return []
  }

  return data.map((profile: { id: string }) => profile.id)
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get('cursor') // Cursor = created_at del último comentario
    const limit = 20 // Número de comentarios principales por página
    
    const supabase = await createServerSupabaseClient()
    
    // Construir query base para comentarios principales (parent_id = NULL)
    let query = supabase
      .from('comments')
      .select(`
        id,
        post_id,
        user_id,
        content,
        created_at,
        parent_id,
        is_deleted,
        deleted_at,
        profiles!comments_user_id_fkey (
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('post_id', id)
      .is('parent_id', null) // Solo comentarios principales
      .order('created_at', { ascending: true })
      .limit(limit + 1) // +1 para detectar si hay más páginas

    // Si hay cursor, filtrar desde ese punto
    if (cursor) {
      query = query.gt('created_at', cursor)
    }

    const { data: mainCommentsData, error: mainError } = await query

    if (mainError) {
      console.error('Error fetching main comments:', mainError)
      return NextResponse.json(
        { data: null, error: 'Error al obtener comentarios', nextCursor: null },
        { status: 500 }
      )
    }

    // Determinar si hay más páginas
    const hasMore = mainCommentsData && mainCommentsData.length > limit
    const commentsToReturn = hasMore ? mainCommentsData.slice(0, limit) : mainCommentsData
    const nextCursor = hasMore && commentsToReturn.length > 0
      ? commentsToReturn[commentsToReturn.length - 1].created_at
      : null

    // Obtener IDs de los comentarios principales para buscar sus respuestas
    const mainCommentIds = commentsToReturn?.map(c => c.id) || []

    // Si no hay comentarios principales, retornar vacío
    if (mainCommentIds.length === 0) {
      return NextResponse.json({ 
        data: [], 
        error: null, 
        nextCursor: null 
      })
    }

    // Obtener TODAS las respuestas (recursivas) de estos comentarios principales
    const { data: repliesData, error: repliesError } = await supabase
      .from('comments')
      .select(`
        id,
        post_id,
        user_id,
        content,
        created_at,
        parent_id,
        is_deleted,
        deleted_at,
        profiles!comments_user_id_fkey (
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('post_id', id)
      .not('parent_id', 'is', null) // Solo respuestas
      .order('created_at', { ascending: true })

    if (repliesError) {
      console.error('Error fetching replies:', repliesError)
      // No es crítico, continuar sin replies
    }

    // Combinar comentarios principales y respuestas
    const allComments = [...(commentsToReturn || []), ...(repliesData || [])]

    // Organizar comentarios en estructura anidada
    const commentsMap = new Map<string, Comment>()

    // Primero, crear todos los comentarios
    allComments.forEach((comment: {
      id: string;
      post_id: string;
      user_id: string;
      content: string;
      created_at: string;
      parent_id: string | null;
      is_deleted: boolean;
      deleted_at: string | null;
      profiles: {
        full_name: string | null;
        email: string;
        avatar_url: string | null;
      } | {
        full_name: string | null;
        email: string;
        avatar_url: string | null;
      }[];
    }) => {
      const commentObj: Comment = {
        id: comment.id,
        post_id: comment.post_id,
        user_id: comment.user_id,
        content: comment.is_deleted ? '[Comentario eliminado]' : comment.content,
        created_at: comment.created_at,
        parent_id: comment.parent_id,
        is_deleted: comment.is_deleted,
        deleted_at: comment.deleted_at,
        profiles: comment.is_deleted ? undefined : (Array.isArray(comment.profiles) 
          ? comment.profiles[0] 
          : comment.profiles),
        replies: []
      }
      commentsMap.set(comment.id, commentObj)
    })

    // En lugar de estructura anidada, devolver lista plana
    // Esto facilita el filtrado en el frontend
    const flatComments: Comment[] = []
    
    commentsMap.forEach((comment) => {
      flatComments.push(comment)
    })

    // Ordenar: primero comentarios principales, luego respuestas
    flatComments.sort((a, b) => {
      // Si ambos son principales o ambos son respuestas, ordenar por fecha
      if ((!a.parent_id && !b.parent_id) || (a.parent_id && b.parent_id)) {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      }
      // Los principales van primero
      return a.parent_id ? 1 : -1
    })

    return NextResponse.json({ 
      data: flatComments, 
      error: null,
      nextCursor 
    })
    
  } catch (error) {
    console.error('Error in comments API:', error)
    return NextResponse.json(
      { data: null, error: 'Error interno del servidor', nextCursor: null },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const body = await request.json()
    const { content, parent_id } = body


    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { data: null, error: 'El contenido del comentario es requerido' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()
    
    // Obtener el usuario autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { data: null, error: 'Usuario no autenticado' },
        { status: 401 }
      )
    }

    // Verificar que el usuario tiene suscripción activa
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('subscription_status')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.subscription_status !== 'Active') {
      return NextResponse.json(
        { data: null, error: 'Necesitas una suscripción activa' },
        { status: 403 }
      )
    }

    // Si es una respuesta, verificar que el comentario padre existe
    if (parent_id) {
      const { data: parentComment, error: parentError } = await supabase
        .from('comments')
        .select('id, post_id')
        .eq('id', parent_id)
        .single()

      if (parentError || !parentComment || parentComment.post_id !== id) {
        return NextResponse.json(
          { data: null, error: 'Comentario padre no válido' },
          { status: 400 }
        )
      }
    }

    // Insertar el comentario
    const { data: commentData, error: insertError } = await supabase
      .from('comments')
      .insert({
        post_id: id,
        user_id: user.id,
        content: content.trim(),
        parent_id: parent_id || null
      })
      .select(`
        id,
        post_id,
        user_id,
        content,
        created_at,
        parent_id,
        profiles!comments_user_id_fkey (
          full_name,
          email,
          avatar_url
        )
      `)
      .single()

    if (insertError) {
      console.error('Error inserting comment:', insertError)
      return NextResponse.json(
        { data: null, error: 'Error al crear el comentario' },
        { status: 500 }
      )
    }

    // Obtener el contador actual y incrementar
    const { data: currentPost } = await supabase
      .from('posts')
      .select('comments_count')
      .eq('id', id)
      .single()

    if (currentPost) {
      const { error: updateError } = await supabase
        .from('posts')
        .update({ 
          comments_count: currentPost.comments_count + 1
        })
        .eq('id', id)

      if (updateError) {
        console.error('Error updating comments count:', updateError)
      }
    }

    // Obtener información del post para la notificación
    const { data: postData } = await supabase
      .from('posts')
      .select('author_id, title')
      .eq('id', id)
      .single()

    // Obtener nombre del usuario que comentó
    const { data: commenterProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()

    // Extraer menciones del contenido
    const mentionedNames = extractMentions(content.trim())
    
    const mentionedUserIds = await getUserIdsByNames(mentionedNames, supabase)

    // Crear notificaciones según el caso
    if (postData && commenterProfile) {
      if (!parent_id) {
        // Es un comentario nuevo en el post
        await createSocialNotification({
          recipientUserId: postData.author_id,
          actorUserId: user.id,
          actorName: commenterProfile.full_name || 'Un usuario',
          type: 'comment',
          postId: id,
          postTitle: postData.title
        })

        // Enviar notificaciones de mención (si hay menciones)
        if (mentionedUserIds.length > 0) {
          await createMentionNotifications({
            mentionedUserIds,
            parentCommentAuthorId: postData.author_id, // En comentarios principales, el "padre" es el autor del post
            actorUserId: user.id,
            actorName: commenterProfile.full_name || 'Un usuario',
            postId: id,
            postTitle: postData.title,
            commentId: commentData.id
          })
        }
      } else {
        // Es una respuesta a un comentario
        // Obtener el comentario padre para notificar a su autor
        const { data: parentComment } = await supabase
          .from('comments')
          .select('user_id')
          .eq('id', parent_id)
          .single()

        if (parentComment) {
          // Notificación de respuesta al autor del comentario padre
          await createSocialNotification({
            recipientUserId: parentComment.user_id,
            actorUserId: user.id,
            actorName: commenterProfile.full_name || 'Un usuario',
            type: 'reply',
            postId: id,
            postTitle: postData.title,
            commentId: parent_id
          })

          // Enviar notificaciones de mención (si hay menciones)
          if (mentionedUserIds.length > 0) {
            await createMentionNotifications({
              mentionedUserIds,
              parentCommentAuthorId: parentComment.user_id, // El autor del comentario padre
              actorUserId: user.id,
              actorName: commenterProfile.full_name || 'Un usuario',
              postId: id,
              postTitle: postData.title,
              commentId: commentData.id
            })
          }
        }
      }
    }

    const comment: Comment = {
    id: commentData.id,
    post_id: commentData.post_id,
    user_id: commentData.user_id,
    content: commentData.content,
    created_at: commentData.created_at,
    parent_id: commentData.parent_id,
    is_deleted: false,
    deleted_at: null,
    profiles: Array.isArray(commentData.profiles) 
      ? commentData.profiles[0] 
      : commentData.profiles,
    replies: []
  }

    return NextResponse.json({ data: comment, error: null })
    
  } catch (error) {
    console.error('Error in POST comments API:', error)
    return NextResponse.json(
      { data: null, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}