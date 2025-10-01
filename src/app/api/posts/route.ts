import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/server-supabase'
import { isValidImageUrl } from '@/lib/storage-client'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { searchParams } = new URL(request.url)
    
    // Parámetros de query
    const limit = searchParams.get('limit')
    const orderBy = searchParams.get('orderBy') || 'created_at'
    const ascending = searchParams.get('ascending') === 'true'

    let query = supabase
      .from('posts')
      .select('*')
      .order(orderBy, { ascending })

    if (limit) {
      query = query.limit(parseInt(limit))
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json(
        { data: null, error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ data, error: null })
  } catch {
    return NextResponse.json(
      { data: null, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const body = await request.json()
    
    const { title, content, category, authorId, images } = body

    if (!title || !content || !authorId) {
      return NextResponse.json(
        { data: null, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validar imágenes si se enviaron
    if (images && Array.isArray(images)) {
      // Obtener configuración de imágenes
      const { data: settings } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'image_settings')
        .single()

      if (settings) {
        const { max_images_per_post } = settings.value

        // Validar cantidad
        if (images.length > max_images_per_post) {
          return NextResponse.json(
            { data: null, error: `Máximo ${max_images_per_post} imágenes por post` },
            { status: 400 }
          )
        }

        // Validar que todas las URLs sean válidas
        for (const url of images) {
          if (!isValidImageUrl(url)) {
            return NextResponse.json(
              { data: null, error: 'Una o más URLs de imágenes no son válidas' },
              { status: 400 }
            )
          }
        }
      }
    }

    // Obtener la hora actual en UTC correctamente
    const now = new Date().toISOString()
    
    const { data, error } = await supabase
      .from('posts')
      .insert({
        title,
        content,
        category,
        author_id: authorId,
        created_at: now,
        images: images || []
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { data: null, error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({ data, error: null })
  } catch {
    return NextResponse.json(
      { data: null, error: 'Internal server error' },
      { status: 500 }
    )
  }
}