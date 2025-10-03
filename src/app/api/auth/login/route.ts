import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/server-supabase'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { data: null, error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return NextResponse.json(
        { data: null, error: error.message },
        { status: 400 }
      )
    }

    // Obtener el perfil del usuario
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type, subscription_status, subscription_expires_at, is_banned')
      .eq('id', data.user.id)
      .single()

    // Validar si el usuario está banneado
    if (profile?.is_banned) {
      // Destruir la sesión inmediatamente
      await supabase.auth.signOut()
      
      return NextResponse.json(
        { data: null, error: 'Tu cuenta ha sido suspendida. Contacta a soporte si crees que esto es un error.' },
        { status: 403 }
      )
    }

    // Verificar y actualizar estado de suscripción si es necesario
    if (profile) {
      const { isSubscriptionExpired, updateExpiredSubscription } = await import('@/lib/subscription-utils')
      
      if (isSubscriptionExpired(profile.subscription_expires_at) && 
          profile.subscription_status === 'Active') {
        
        console.log('Login: Actualizando suscripción expirada para usuario:', data.user.email)
        await updateExpiredSubscription(data.user.id)
        
        // Actualizar el perfil local para retornar el estado correcto
        profile.subscription_status = 'Expired'
      }
    }

    return NextResponse.json({
      data: {
        user: data.user,
        session: data.session,
        userType: profile?.user_type || 'anonymous',
        subscriptionStatus: profile?.subscription_status || null
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