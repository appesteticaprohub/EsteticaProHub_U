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
      (profile.subscription_status === 'Cancelled' && expiresAt && expiresAt > now)

    if (!isAllowed) {
      return NextResponse.json(
        { data: null, error: 'Suscripción requerida para buscar' },
        { status: 403 }
      )
    }

    // Obtener parámetros de búsqueda
    const title = searchParams.get('title')
    const content = searchParams.get('content')
    const author = searchParams.get('author')
    const category = searchParams.get('category')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const sortBy = searchParams.get('sort_by') || 'created_at'
    const sortOrder = searchParams.get('sort_order') || 'desc'

    // Calcular offset para paginación
    const offset = (page - 1) * limit

    // Construir query base
    let query = supabase
      .from('posts')
      .select('*', { count: 'exact' })
      .eq('is_deleted', false)

    // Aplicar filtros
    if (title) {
      query = query.ilike('title', `%${title}%`)
    }

    if (content) {
      query = query.ilike('content', `%${content}%`)
    }

    if (category) {
      query = query.eq('category', category)
    }

    if (dateFrom) {
      query = query.gte('created_at', dateFrom)
    }

    if (dateTo) {
      // Agregar un día completo para incluir todo el día seleccionado
      const endDate = new Date(dateTo)
      endDate.setDate(endDate.getDate() + 1)
      query = query.lt('created_at', endDate.toISOString())
    }

    // Filtro por autor (buscar en nombre o email)
    if (author) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id')
        .or(`full_name.ilike.%${author}%,email.ilike.%${author}%`)

      if (profiles && profiles.length > 0) {
        const authorIds = profiles.map(p => p.id)
        query = query.in('author_id', authorIds)
      } else {
        // Si no se encuentra ningún autor, devolver array vacío
        return NextResponse.json({
          data: {
            posts: [],
            total: 0,
            page,
            totalPages: 0
          },
          error: null
        })
      }
    }

    // Aplicar ordenamiento
    const validSortFields = ['created_at', 'likes_count', 'views_count', 'comments_count', 'title']
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at'
    const ascending = sortOrder === 'asc'

    query = query.order(sortField, { ascending })

    // Aplicar paginación
    query = query.range(offset, offset + limit - 1)

    const { data: posts, error, count } = await query

    if (error) {
      return NextResponse.json(
        { data: null, error: error.message },
        { status: 400 }
      )
    }

    // Obtener información de los autores en una segunda query
    if (posts && posts.length > 0) {
      const authorIds = [...new Set(posts.map(post => post.author_id))]
      
      const { data: authorsData } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', authorIds)

      // Mapear autores a posts
      const authorsMap = new Map(authorsData?.map(author => [author.id, author]))
      
      const postsWithAuthors = posts.map(post => ({
        ...post,
        author: authorsMap.get(post.author_id) || null
      }))

      const totalPages = count ? Math.ceil(count / limit) : 0

      return NextResponse.json({
        data: {
          posts: postsWithAuthors,
          total: count || 0,
          page,
          totalPages
        },
        error: null
      })
    }

    const totalPages = count ? Math.ceil(count / limit) : 0

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