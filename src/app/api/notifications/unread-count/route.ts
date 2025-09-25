import { NextResponse } from 'next/server'
import { createServerSupabaseClient, getCurrentUser } from '@/lib/server-supabase'

// GET - Obtener conteo de notificaciones no leídas
export async function GET() {
  try {
    const { user, error: authError } = await getCurrentUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { data: null, error: 'No autorizado' },
        { status: 401 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // Usar la función de la base de datos para obtener el conteo
    const { data: count, error } = await supabase.rpc('get_unread_notifications_count', {
      user_uuid: user.id
    })

    if (error) {
      return NextResponse.json(
        { data: null, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: { count: count || 0 },
      error: null
    })

  } catch (error) {
    return NextResponse.json(
      { data: null, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}