import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getCurrentUser } from '@/lib/server-supabase'
import { createSocialNotification } from '@/lib/social-notification-service'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { user } = await getCurrentUser()
    const { id: postId } = await params

    // Obtener contador de likes del post
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('likes_count')
      .eq('id', postId)
      .single()

    if (postError) {
      return NextResponse.json(
        { data: null, error: postError.message },
        { status: 400 }
      )
    }

    let isLiked = false

    // Si hay usuario, verificar si ya dio like
    if (user) {
      const { data: like } = await supabase
        .from('likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .maybeSingle()

      isLiked = !!like
    }

    return NextResponse.json({
      data: {
        isLiked,
        likesCount: post.likes_count || 0
      },
      error: null
    })
  } catch {
    return NextResponse.json(
      { data: null, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { user } = await getCurrentUser()
    const { id: postId } = await params

    if (!user) {
      return NextResponse.json(
        { data: null, error: 'Necesitas una suscripción' },
        { status: 401 }
      )
    }

    // Verificar si ya dio like
    const { data: existingLike } = await supabase
      .from('likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (existingLike) {
      // Ya dio like, quitarlo
      const { error: deleteError } = await supabase
        .from('likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id)

      if (deleteError) {
        return NextResponse.json(
          { data: null, error: deleteError.message },
          { status: 400 }
        )
      }

      // Decrementar contador
      const { data: currentPost } = await supabase
        .from('posts')
        .select('likes_count')
        .eq('id', postId)
        .single()

      if (currentPost) {
        const newCount = Math.max(0, currentPost.likes_count - 1)
        
        await supabase
          .from('posts')
          .update({ likes_count: newCount })
          .eq('id', postId)

        return NextResponse.json({
          data: {
            isLiked: false,
            likesCount: newCount,
            showSnackBar: false
          },
          error: null
        })
      }
    } else {
      // Dar like
      const { error: insertError } = await supabase
        .from('likes')
        .insert({
          post_id: postId,
          user_id: user.id
        })

      if (insertError) {
        return NextResponse.json(
          { data: null, error: insertError.message },
          { status: 400 }
        )
      }

      // Incrementar contador
      const { data: currentPost } = await supabase
        .from('posts')
        .select('likes_count, author_id, title')
        .eq('id', postId)
        .single()

      if (currentPost) {
        const newCount = currentPost.likes_count + 1
        
        await supabase
          .from('posts')
          .update({ likes_count: newCount })
          .eq('id', postId)

        // Obtener nombre del usuario que dio like
        const { data: likerProfile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single()

        // Crear notificación de like
        if (likerProfile) {
          await createSocialNotification({
            recipientUserId: currentPost.author_id,
            actorUserId: user.id,
            actorName: likerProfile.full_name || 'Un usuario',
            type: 'like',
            postId: postId,
            postTitle: currentPost.title
          })
        }

        return NextResponse.json({
          data: {
            isLiked: true,
            likesCount: newCount,
            showSnackBar: false
          },
          error: null
        })
      }
    }

    return NextResponse.json(
      { data: null, error: 'Error processing like' },
      { status: 500 }
    )
  } catch {
    return NextResponse.json(
      { data: null, error: 'Internal server error' },
      { status: 500 }
    )
  }
}