import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getCurrentUser } from '@/lib/server-supabase'

// GET - Obtener preferencias del usuario
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

    const { data: preferences, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error) {
      return NextResponse.json(
        { data: null, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: preferences,
      error: null
    })

  } catch (error) {
    return NextResponse.json(
      { data: null, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// PUT - Actualizar preferencias del usuario
export async function PUT(request: NextRequest) {
  try {
    const { user, error: authError } = await getCurrentUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { data: null, error: 'No autorizado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { email_promotional, email_content, in_app_notifications } = body

    const supabase = await createServerSupabaseClient()

    const updateData: any = {}
    
    if (email_promotional !== undefined) updateData.email_promotional = email_promotional
    if (email_content !== undefined) updateData.email_content = email_content
    if (in_app_notifications !== undefined) updateData.in_app_notifications = in_app_notifications

    const { data: preferences, error } = await supabase
      .from('notification_preferences')
      .update(updateData)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { data: null, error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: preferences,
      error: null
    })

  } catch (error) {
    return NextResponse.json(
      { data: null, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}