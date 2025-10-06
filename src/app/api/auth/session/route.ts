import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/server-supabase'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      return NextResponse.json({
        data: {
          user: null,
          session: null,
          userType: 'anonymous',
          subscriptionStatus: null,
          isBanned: false
        },
        error: null
      })
    }

    // Obtener el perfil del usuario
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_type, subscription_status, is_banned')
      .eq('id', session.user.id)
      .single()

    // VALIDACIÓN CRÍTICA: Si el perfil no existe, el usuario fue eliminado
    if (profileError || !profile) {
      // Destruir la sesión inmediatamente
      await supabase.auth.signOut()
      
      return NextResponse.json({
        data: {
          user: null,
          session: null,
          userType: 'anonymous',
          subscriptionStatus: null,
          isBanned: false
        },
        error: null
      })
    }
    
    // Validar si el usuario fue banneado mientras tenía sesión activa
    if (profile.is_banned) {
      // Destruir la sesión inmediatamente
      await supabase.auth.signOut()
      
      return NextResponse.json({
        data: {
          user: null,
          session: null,
          userType: 'anonymous',
          subscriptionStatus: null,
          isBanned: true
        },
        error: null
      })
    }
    
    return NextResponse.json({
      data: {
        user: session.user,
        session,
        userType: profile.user_type || 'anonymous',
        subscriptionStatus: profile.subscription_status || null,
        isBanned: false
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