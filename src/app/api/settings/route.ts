import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/server-supabase'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')

    // Si se solicita una configuración específica
    if (key) {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', key)
        .single()

      if (error) {
        return NextResponse.json(
          { data: null, error: error.message },
          { status: 400 }
        )
      }

      // Parsear el valor si es string JSON
      const value = typeof data.value === 'string' ? JSON.parse(data.value) : data.value
      return NextResponse.json({ data: value, error: null })
    }

    // Si no se especifica key, retornar todas las configuraciones públicas
    const { data, error } = await supabase
      .from('app_settings')
      .select('key, value')

    if (error) {
      return NextResponse.json(
        { data: null, error: error.message },
        { status: 400 }
      )
    }

    // Convertir array a objeto para fácil acceso y parsear valores JSON
    const settings = data.reduce((acc, item) => {
      const value = typeof item.value === 'string' ? JSON.parse(item.value) : item.value
      acc[item.key] = value
      return acc
    }, {} as Record<string, any>)

    return NextResponse.json({ data: settings, error: null })

  } catch (error) {
    console.error('Error en settings route:', error)
    return NextResponse.json(
      { data: null, error: 'Internal server error' },
      { status: 500 }
    )
  }
}