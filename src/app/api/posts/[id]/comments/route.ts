import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/server-supabase'
import { Comment } from '@/types/api'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    
    const supabase = await createServerSupabaseClient()
    
    const { data: commentsData, error } = await supabase
      .from('comments')
      .select(`
        id,
        post_id,
        user_id,
        content,
        created_at,
        profiles!inner (
          full_name,
          email
        )
      `)
      .eq('post_id', id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching comments:', error)
      return NextResponse.json(
        { data: null, error: 'Error al obtener comentarios' },
        { status: 500 }
      )
    }

    const comments: Comment[] = commentsData?.map((comment: any) => ({
      id: comment.id,
      post_id: comment.post_id,
      user_id: comment.user_id,
      content: comment.content,
      created_at: comment.created_at,
      profiles: Array.isArray(comment.profiles) 
        ? comment.profiles[0] 
        : comment.profiles
    })) || []

    return NextResponse.json({ data: comments, error: null })
    
  } catch (error) {
    console.error('Error in comments API:', error)
    return NextResponse.json(
      { data: null, error: 'Error interno del servidor' },
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

    // Insertar el comentario
    const { data: commentData, error: insertError } = await supabase
      .from('comments')
      .insert({
        post_id: id,
        user_id: user.id,
        content: content.trim()
      })
      .select(`
        id,
        post_id,
        user_id,
        content,
        created_at,
        profiles!inner (
          full_name,
          email
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

    const comment: Comment = {
      id: commentData.id,
      post_id: commentData.post_id,
      user_id: commentData.user_id,
      content: commentData.content,
      created_at: commentData.created_at,
      profiles: Array.isArray(commentData.profiles) 
        ? commentData.profiles[0] 
        : commentData.profiles
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