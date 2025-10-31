import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/server-supabase'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { email } = await request.json()

    // Validar que el email esté presente
    if (!email) {
      return NextResponse.json(
        { error: 'El correo electrónico es requerido' },
        { status: 400 }
      )
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'El formato del correo electrónico no es válido' },
        { status: 400 }
      )
    }

    // Verificar si el usuario es staff (los usuarios staff no pueden recuperar contraseña)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('email', email.toLowerCase())
      .single()
    
    if (profile && profile.role === 'staff') {
      return NextResponse.json(
        { error: 'Los usuarios staff no pueden recuperar su contraseña. Contacta al administrador para restablecer tus credenciales.' },
        { status: 403 }
      )
    }

    // Solicitar reset de contraseña a Supabase
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/restablecer-contrasena`,
    })

    // IMPORTANTE: No revelamos si el email existe o no por seguridad
    // Siempre devolvemos éxito
    if (error) {
      console.error('Error al solicitar recuperación:', error.message)
    }

    return NextResponse.json({
      message: 'Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña'
    })
  } catch (error) {
    console.error('Error en forgot-password:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}