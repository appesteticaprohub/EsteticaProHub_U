import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getCurrentUser } from '@/lib/server-supabase'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { searchParams } = new URL(request.url)
    
    // Verificar autenticación
    const { user, error: authError } = await getCurrentUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { data: null, error: 'No autenticado' },
        { status: 401 }
      )
    }

    // Verificar estado de suscripción
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_status, subscription_expires_at')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json(
        { data: null, error: 'Perfil no encontrado' },
        { status: 404 }
      )
    }

    // Validar estados permitidos
    const allowedStatuses = ['Active', 'Payment_Failed', 'Grace_Period']
    const now = new Date()
    const expiresAt = profile.subscription_expires_at ? new Date(profile.subscription_expires_at) : null

    const isAllowed = 
      allowedStatuses.includes(profile.subscription_status) ||
      (profile.subscription_status === 'Cancelled' && expiresAt && expiresAt > now) ||
      (profile.subscription_status === 'Price_Change_Cancelled' && expiresAt && expiresAt > now)

    if (!isAllowed) {
      return NextResponse.json(
        { data: null, error: 'Suscripción requerida para buscar' },
        { status: 403 }
      )
    }

    // Obtener parámetros de búsqueda
    const title = searchParams.get('title')?.trim()
    const content = searchParams.get('content')?.trim()
    const author = searchParams.get('author')?.trim()
    const category = searchParams.get('category')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const sortBy = searchParams.get('sort_by') || 'created_at'
    const sortOrder = searchParams.get('sort_order') || 'desc'

    // Validar longitud mínima para búsquedas de texto
    if (title && title.length < 2) {
      return NextResponse.json({
        data: { posts: [], total: 0, page, totalPages: 0 },
        error: 'El título debe tener al menos 2 caracteres'
      })
    }

    if (content && content.length < 2) {
      return NextResponse.json({
        data: { posts: [], total: 0, page, totalPages: 0 },
        error: 'El contenido debe tener al menos 2 caracteres'
      })
    }

    if (author && author.length < 2) {
      return NextResponse.json({
        data: { posts: [], total: 0, page, totalPages: 0 },
        error: 'El autor debe tener al menos 2 caracteres'
      })
    }

    // Calcular offset para paginación
    const offset = (page - 1) * limit

    // Declarar variable query
    let query

    // ✅ NUEVA OPTIMIZACIÓN: Determinar tipo de búsqueda
    const hasTextSearch = (title || content)
    const hasAuthorSearch = author

    if (hasTextSearch) {
      // ⚡ USAR FULL-TEXT SEARCH simplificado
      console.log('🔍 Usando Full-Text Search')
      
      // Construir query de texto
      const searchTerms = []
      if (title) searchTerms.push(title)
      if (content) searchTerms.push(content)
      const fullTextQuery = searchTerms.join(' ')

      query = supabase
        .from('posts')
        .select(`
          *,
          author:profiles!posts_author_id_fkey(id, full_name, email)
        `, { count: 'exact' })
        .eq('is_deleted', false)
        .textSearch('title,content', fullTextQuery, {
          type: 'websearch',
          config: 'spanish'
        })

    } else {
      // 🔍 Búsqueda tradicional para filtros sin texto
      console.log('🔍 Usando búsqueda tradicional')
      
      query = supabase
        .from('posts')
        .select(`
          *,
          author:profiles!posts_author_id_fkey(id, full_name, email)
        `, { count: 'exact' })
        .eq('is_deleted', false)
    }

    // ✅ APLICAR FILTROS ADICIONALES
    if (category) {
      query = query.eq('category', category)
    }

    if (dateFrom) {
      query = query.gte('created_at', dateFrom)
    }

    if (dateTo) {
      const endDate = new Date(dateTo)
      endDate.setDate(endDate.getDate() + 1)
      query = query.lt('created_at', endDate.toISOString())
    }

    // ✅ OPTIMIZACIÓN: Filtro de autor usando índice
    if (hasAuthorSearch) {
      // Primero buscar autores que coincidan
      const { data: matchingProfiles } = await supabase
        .from('profiles')
        .select('id')
        .or(`full_name.ilike.%${author}%,email.ilike.%${author}%`)
        .limit(100) // Limitar para evitar queries muy grandes

      if (matchingProfiles && matchingProfiles.length > 0) {
        const authorIds = matchingProfiles.map(p => p.id)
        query = query.in('author_id', authorIds)
      } else {
        // Si no hay autores, retornar vacío
        return NextResponse.json({
          data: { posts: [], total: 0, page, totalPages: 0 },
          error: null
        })
      }
    }

    // ✅ APLICAR ORDENAMIENTO
    const validSortFields = ['created_at', 'likes_count', 'views_count', 'comments_count', 'title']
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at'
    const ascending = sortOrder === 'asc'

    if (hasTextSearch && sortField === 'created_at') {
      // Para búsquedas de texto, mantener orden por relevancia natural de PostgreSQL
      query = query.order('created_at', { ascending: false })
    } else {
      query = query.order(sortField, { ascending })
    }

    // ✅ APLICAR PAGINACIÓN
    query = query.range(offset, offset + limit - 1)

    console.log('🚀 Ejecutando búsqueda optimizada...')
    const { data: posts, error, count } = await query

    if (error) {
      console.error('Search query error:', error)
      return NextResponse.json(
        { data: null, error: 'Error en la búsqueda: ' + error.message },
        { status: 400 }
      )
    }

    const totalPages = count ? Math.ceil(count / limit) : 0

    console.log(`✅ Búsqueda completada: ${count} resultados, página ${page}/${totalPages}`)

    return NextResponse.json({
      data: {
        posts: posts || [],
        total: count || 0,
        page,
        totalPages
      },
      error: null
    })

  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { data: null, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}