import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/server-supabase'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Obtener límite desde app_settings
    const { data: setting, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'ANONYMOUS_POST_LIMIT')
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error obteniendo límite:', error)
      return NextResponse.json(
        { data: null, error: 'Error al obtener límite' },
        { status: 500 }
      )
    }

    // Si no existe, retornar valor por defecto
    const limit = setting?.value ? parseInt(setting.value, 10) : 1

    return NextResponse.json({
      data: { limit },
      error: null
    })
  } catch (error) {
    console.error('Error en GET /api/anonymous/limit:', error)
    return NextResponse.json(
      { data: null, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}