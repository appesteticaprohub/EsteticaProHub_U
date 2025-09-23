import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const viewedCount = cookieStore.get('anonymous_posts_viewed')?.value || '0'
    
    return NextResponse.json({
      data: {
        viewedPostsCount: parseInt(viewedCount, 10),
        hasReachedLimit: parseInt(viewedCount, 10) > 1
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
    
    const response = NextResponse.json({
      data: {
        viewedPostsCount: newCount,
        hasReachedLimit: newCount > 1
      },
      error: null
    })

    // Establecer cookie que expira en 24 horas
    response.cookies.set('anonymous_posts_viewed', newCount.toString(), {
      maxAge: 60 * 60 * 24, // 24 horas
      httpOnly: false, // Permitir acceso desde JS para compatibilidad
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