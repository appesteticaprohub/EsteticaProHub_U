import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getCurrentUser } from '@/lib/server-supabase'
import { cookies } from 'next/headers'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { user } = await getCurrentUser()
    const { id } = params

    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      return NextResponse.json(
        { data: null, error: error.message },
        { status: error.code === 'PGRST116' ? 404 : 400 }
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
  } catch (error) {
    return NextResponse.json(
      { data: null, error: 'Internal server error' },
      { status: 500 }
    )
  }
}