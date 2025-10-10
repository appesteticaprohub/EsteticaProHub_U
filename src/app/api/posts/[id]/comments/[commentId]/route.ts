import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/server-supabase'
import { Comment } from '@/types/api'

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { id, commentId } = await context.params
    const body = await request.json()
    const { content } = body

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

    // Verificar que el comentario existe y pertenece al usuario
    const { data: existingComment, error: commentError } = await supabase
      .from('comments')
      .select('id, user_id, post_id')
      .eq('id', commentId)
      .eq('post_id', id)
      .single()

    if (commentError || !existingComment) {
      return NextResponse.json(
        { data: null, error: 'Comentario no encontrado' },
        { status: 404 }
      )
    }

    if (existingComment.user_id !== user.id) {
      return NextResponse.json(
        { data: null, error: 'No tienes permisos para editar este comentario' },
        { status: 403 }
      )
    }

    // Actualizar el comentario
    const { data: commentData, error: updateError } = await supabase
      .from('comments')
      .update({
        content: content.trim()
      })
      .eq('id', commentId)
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
          email
        )
      `)
      .single()

    if (updateError) {
      console.error('Error updating comment:', updateError)
      return NextResponse.json(
        { data: null, error: 'Error al actualizar el comentario' },
        { status: 500 }
      )
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
    console.error('Error in PUT comment API:', error)
    return NextResponse.json(
      { data: null, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; commentId: string }> }
) {
  try {
    const { id, commentId } = await context.params

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

    // Verificar que el comentario existe y pertenece al usuario
    const { data: existingComment, error: commentError } = await supabase
      .from('comments')
      .select('id, user_id, post_id, is_deleted')
      .eq('id', commentId)
      .eq('post_id', id)
      .single()

    if (commentError || !existingComment) {
      return NextResponse.json(
        { data: null, error: 'Comentario no encontrado' },
        { status: 404 }
      )
    }

    if (existingComment.user_id !== user.id) {
      return NextResponse.json(
        { data: null, error: 'No tienes permisos para eliminar este comentario' },
        { status: 403 }
      )
    }

    if (existingComment.is_deleted) {
      return NextResponse.json(
        { data: null, error: 'El comentario ya fue eliminado' },
        { status: 400 }
      )
    }

    // Soft delete: marcar como eliminado
    const { error: deleteError } = await supabase
      .from('comments')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString()
      })
      .eq('id', commentId)

    if (deleteError) {
      console.error('Error deleting comment:', deleteError)
      return NextResponse.json(
        { data: null, error: 'Error al eliminar el comentario' },
        { status: 500 }
      )
    }

    // Decrementar el contador de comentarios del post
    const { data: currentPost } = await supabase
      .from('posts')
      .select('comments_count')
      .eq('id', id)
      .single()

    if (currentPost && currentPost.comments_count > 0) {
      const { error: updateError } = await supabase
        .from('posts')
        .update({ 
          comments_count: currentPost.comments_count - 1
        })
        .eq('id', id)

      if (updateError) {
        console.error('Error updating comments count:', updateError)
      }
    }

    return NextResponse.json({ data: { success: true }, error: null })
    
  } catch (error) {
    console.error('Error in DELETE comment API:', error)
    return NextResponse.json(
      { data: null, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}