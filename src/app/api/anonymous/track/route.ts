import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/server-supabase'

// Función para obtener el límite dinámico
async function getAnonymousLimit(): Promise<number> {
  try {
    const supabase = await createServerSupabaseClient()
    
    const { data: setting, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'ANONYMOUS_POST_LIMIT')
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error obteniendo límite:', error)
      return 1 // Valor por defecto en caso de error
    }

    return setting?.value ? parseInt(setting.value, 10) : 1
  } catch (error) {
    console.error('Error en getAnonymousLimit:', error)
    return 1
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies()
    const viewedCount = cookieStore.get('anonymous_posts_viewed')?.value || '0'
    const limit = await getAnonymousLimit()
    
    return NextResponse.json({
      data: {
        viewedPostsCount: parseInt(viewedCount, 10),
        hasReachedLimit: parseInt(viewedCount, 10) > limit,
        limit
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

export async function POST() {
  try {
    const cookieStore = await cookies()
    const currentCount = parseInt(cookieStore.get('anonymous_posts_viewed')?.value || '0', 10)
    const newCount = currentCount + 1
    const limit = await getAnonymousLimit()
    
    const response = NextResponse.json({
      data: {
        viewedPostsCount: newCount,
        hasReachedLimit: newCount > limit,
        limit
      },
      error: null
    })

    // Establecer cookie que expira en 1 año
    response.cookies.set('anonymous_posts_viewed', newCount.toString(), {
      maxAge: 60 * 60 * 24 * 365, // 1 año
      httpOnly: false,
      sameSite: 'strict'
    })

    return response
  } catch {
    return NextResponse.json(
      { data: null, error: 'Internal server error' },
      { status: 500 }
    )
  }
}