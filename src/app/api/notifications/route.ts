import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getCurrentUser } from '@/lib/server-supabase'
import type { NotificationFilters } from '@/types/api'

// GET - Obtener notificaciones del usuario
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getCurrentUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { data: null, error: 'No autorizado' },
        { status: 401 }
      )
    }

    const supabase = await createServerSupabaseClient()
    const { searchParams } = new URL(request.url)
    
    // Construir filtros
    const type = searchParams.get('type') as 'email' | 'in_app' | null
    const category = searchParams.get('category') as 'critical' | 'important' | 'normal' | 'promotional' | null
    const is_read = searchParams.get('is_read')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .or('expires_at.is.null,expires_at.gt.now()')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (type) {
      query = query.eq('type', type)
    }

    if (category) {
      query = query.eq('category', category)
    }

    if (is_read !== null) {
      query = query.eq('is_read', is_read === 'true')
    }

    const { data: notifications, error } = await query

    if (error) {
      return NextResponse.json(
        { data: null, error: error.message },
        { status: 500 }
      )
    }

    // Obtener total de notificaciones para paginación
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .or('expires_at.is.null,expires_at.gt.now()')

    return NextResponse.json({
      notifications: notifications || [],
      total: count || 0
    })

  } catch (error) {
    return NextResponse.json(
      { data: null, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// PATCH - Marcar notificación como leída
export async function PATCH(request: NextRequest) {
  try {
    const { user, error: authError } = await getCurrentUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { data: null, error: 'No autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { notification_id, mark_all_as_read } = body

    const supabase = await createServerSupabaseClient()

    if (mark_all_as_read) {
      // Marcar todas como leídas usando la función de la base de datos
      const { error } = await supabase.rpc('mark_all_notifications_as_read', {
        user_uuid: user.id
      })

      if (error) {
        return NextResponse.json(
          { data: null, error: error.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        data: { message: 'Todas las notificaciones marcadas como leídas' },
        error: null
      })
    }

    if (!notification_id) {
      return NextResponse.json(
        { data: null, error: 'notification_id es requerido' },
        { status: 400 }
      )
    }

    // Marcar una notificación específica como leída
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notification_id)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json(
        { data: null, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: { message: 'Notificación marcada como leída' },
      error: null
    })

  } catch (error) {
    return NextResponse.json(
      { data: null, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar notificación (solo normal y promotional)
export async function DELETE(request: NextRequest) {
  try {
    const { user, error: authError } = await getCurrentUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { data: null, error: 'No autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { notification_id } = body

    if (!notification_id) {
      return NextResponse.json(
        { data: null, error: 'notification_id es requerido' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // Primero verificar que la notificación pertenece al usuario y obtener su categoría
    const { data: notification, error: fetchError } = await supabase
      .from('notifications')
      .select('category')
      .eq('id', notification_id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !notification) {
      return NextResponse.json(
        { data: null, error: 'Notificación no encontrada' },
        { status: 404 }
      )
    }

    // Solo permitir eliminar notificaciones normales y promocionales
    if (notification.category !== 'normal' && notification.category !== 'promotional') {
      return NextResponse.json(
        { data: null, error: 'No puedes eliminar notificaciones críticas o importantes' },
        { status: 403 }
      )
    }

    // Eliminar la notificación
    const { error: deleteError } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notification_id)
      .eq('user_id', user.id)

    if (deleteError) {
      return NextResponse.json(
        { data: null, error: deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: { message: 'Notificación eliminada correctamente' },
      error: null
    })

  } catch (error) {
    return NextResponse.json(
      { data: null, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}