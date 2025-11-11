import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/server-supabase'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { searchParams } = new URL(request.url)
    
    // Parámetros de query con valores por defecto
    const newestLimit = parseInt(searchParams.get('newestLimit') || '5')
    const mostViewedLimit = parseInt(searchParams.get('mostViewedLimit') || '5')
    const mostCommentedLimit = parseInt(searchParams.get('mostCommentedLimit') || '5')

    // Ejecutar las 3 consultas en paralelo
    const [newestResult, mostViewedResult, mostCommentedResult] = await Promise.all([
      // Consulta 1: Lo más nuevo
      supabase
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
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(newestLimit),

      // Consulta 2: Lo más visto
      supabase
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
        .eq('is_deleted', false)
        .order('views_count', { ascending: false })
        .limit(mostViewedLimit),

      // Consulta 3: Lo más comentado
      supabase
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
        .eq('is_deleted', false)
        .order('comments_count', { ascending: false })
        .limit(mostCommentedLimit)
    ])

    // Verificar errores
    if (newestResult.error) {
      return NextResponse.json(
        { data: null, error: `Error en posts nuevos: ${newestResult.error.message}` },
        { status: 400 }
      )
    }

    if (mostViewedResult.error) {
      return NextResponse.json(
        { data: null, error: `Error en posts más vistos: ${mostViewedResult.error.message}` },
        { status: 400 }
      )
    }

    if (mostCommentedResult.error) {
      return NextResponse.json(
        { data: null, error: `Error en posts más comentados: ${mostCommentedResult.error.message}` },
        { status: 400 }
      )
    }

    // Retornar todos los datos consolidados
    return NextResponse.json({
      data: {
        newest: newestResult.data || [],
        mostViewed: mostViewedResult.data || [],
        mostCommented: mostCommentedResult.data || []
      },
      error: null
    })

  } catch (error) {
    console.error('Error in homepage-data endpoint:', error)
    return NextResponse.json(
      { data: null, error: 'Internal server error' },
      { status: 500 }
    )
  }
}