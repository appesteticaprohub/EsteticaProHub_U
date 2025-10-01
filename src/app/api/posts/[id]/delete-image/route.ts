import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getCurrentUser } from '@/lib/server-supabase'
import { deleteImage, extractPathFromUrl } from '@/lib/storage-client'

export async function POST(
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
    const body = await request.json()
    const { imageUrl } = body

    if (!imageUrl) {
      return NextResponse.json(
        { data: null, error: 'URL de imagen requerida' },
        { status: 400 }
      )
    }

    // Obtener el post
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('author_id, images')
      .eq('id', id)
      .single()

    if (postError || !post) {
      return NextResponse.json(
        { data: null, error: 'Post no encontrado' },
        { status: 404 }
      )
    }

    // Verificar que es el autor
    if (post.author_id !== user.id) {
      return NextResponse.json(
        { data: null, error: 'No tienes permisos para modificar este post' },
        { status: 403 }
      )
    }

    // Verificar que la imagen existe en el post
    const images = post.images || []
    if (!images.includes(imageUrl)) {
      return NextResponse.json(
        { data: null, error: 'La imagen no pertenece a este post' },
        { status: 400 }
      )
    }

    // Eliminar imagen del storage
    const imagePath = extractPathFromUrl(imageUrl)
    if (imagePath) {
      try {
        await deleteImage(imagePath)
      } catch (error) {
        console.error('Error al eliminar imagen del storage:', error)
        // Continuar aunque falle, al menos quitarla de la BD
      }
    }

    // Actualizar el post removiendo la imagen
    const updatedImages = images.filter((url: string) => url !== imageUrl)
    const { error: updateError } = await supabase
      .from('posts')
      .update({ images: updatedImages })
      .eq('id', id)

    if (updateError) {
      return NextResponse.json(
        { data: null, error: updateError.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ 
      data: { message: 'Imagen eliminada exitosamente', images: updatedImages }, 
      error: null 
    })

  } catch (error) {
    console.error('Error en delete-image:', error)
    return NextResponse.json(
      { data: null, error: 'Internal server error' },
      { status: 500 }
    )
  }
}