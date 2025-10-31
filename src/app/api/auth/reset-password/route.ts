import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/server-supabase'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { password, code } = await request.json()

    // Validar que la contraseña y código estén presentes
    if (!password) {
      return NextResponse.json(
        { error: 'La contraseña es requerida' },
        { status: 400 }
      )
    }

    if (!code) {
      return NextResponse.json(
        { error: 'Código de recuperación inválido' },
        { status: 400 }
      )
    }

    // Validar longitud mínima de contraseña
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 8 caracteres' },
        { status: 400 }
      )
    }

    // Verificar el código y establecer sesión temporal
    const { error: verifyError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (verifyError) {
      console.error('Error al verificar código:', verifyError.message)
      return NextResponse.json(
        { error: 'El enlace de recuperación es inválido o ha expirado. Solicita uno nuevo.' },
        { status: 400 }
      )
    }

    // Verificar si el usuario autenticado es staff
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'No se pudo verificar el usuario' },
        { status: 401 }
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (profile && profile.role === 'staff') {
      // Cerrar la sesión inmediatamente
      await supabase.auth.signOut()
      
      return NextResponse.json(
        { error: 'Los usuarios staff no pueden cambiar su contraseña. Contacta al administrador para actualizar tus credenciales.' },
        { status: 403 }
      )
    }

    // Actualizar la contraseña del usuario
    const { error: updateError } = await supabase.auth.updateUser({
      password: password
    })

    if (updateError) {
      console.error('Error al actualizar contraseña:', updateError.message)
      return NextResponse.json(
        { error: 'No se pudo actualizar la contraseña. Intenta nuevamente.' },
        { status: 400 }
      )
    }

    // IMPORTANTE: Cerrar la sesión después de cambiar la contraseña
    await supabase.auth.signOut()

    return NextResponse.json({
      message: 'Contraseña actualizada exitosamente. Por favor inicia sesión con tu nueva contraseña.'
    })
  } catch (error) {
    console.error('Error en reset-password:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}