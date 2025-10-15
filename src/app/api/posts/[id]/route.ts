import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getCurrentUser } from '@/lib/server-supabase'
import { cookies } from 'next/headers'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { user } = await getCurrentUser()
    const { id } = await params

    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        author:profiles!posts_author_id_fkey (
          full_name,
          email,
          avatar_url,
          specialty,
          country
        )
      `)
      .eq('id', id)
      .eq('is_deleted', false)
      .maybeSingle()

    if (error) {
      return NextResponse.json(
        { data: null, error: error.message },
        { status: 400 }
      )
    }

    // Si no se encuentra el post (eliminado o no existe)
    if (!data) {
      return NextResponse.json(
        { data: null, error: 'Post no encontrado' },
        { status: 404 }
      )
    }

    // Si no hay usuario (anónimo), verificar restricciones
    if (!user) {
      const cookieStore = await cookies()
      const viewedCount = parseInt(cookieStore.get('anonymous_posts_viewed')?.value || '0', 10)
      
      // Si ya vio más de 1 post, mostrar contenido limitado
      if (viewedCount > 1) {
        return NextResponse.json({ 
          data: {
            ...data,
            content: data.content.substring(0, 200) + '...', // Mostrar solo los primeros 200 caracteres
            isRestricted: true
          }, 
          error: null 
        })
      }
    }

    return NextResponse.json({ data, error: null })
  } catch {
    return NextResponse.json(
      { data: null, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { user, error: authError } = await getCurrentUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { data: null, error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { id } = await params

    // Verificar que el post existe y es del usuario
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('author_id')
      .eq('id', id)
      .single()

    if (postError || !post) {
      return NextResponse.json(
        { data: null, error: 'Post no encontrado' },
        { status: 404 }
      )
    }

    if (post.author_id !== user.id) {
      return NextResponse.json(
        { data: null, error: 'No tienes permisos para eliminar este post' },
        { status: 403 }
      )
    }

    // Eliminar el post (las imágenes se pueden limpiar después con un job)
    const { error: deleteError } = await supabase
      .from('posts')
      .delete()
      .eq('id', id)

    if (deleteError) {
      return NextResponse.json(
        { data: null, error: deleteError.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ 
      data: { message: 'Post eliminado exitosamente' }, 
      error: null 
    })

  } catch {
    return NextResponse.json(
      { data: null, error: 'Internal server error' },
      { status: 500 }
    )
  }
}