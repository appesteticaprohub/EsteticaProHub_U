import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, getCurrentUser } from '@/lib/server-supabase'

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
          subscriptionStatus: null
        },
        error: null
      })
    }

    // Obtener el perfil del usuario
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_type, subscription_status')
      .eq('id', session.user.id)
      .single()

    return NextResponse.json({
      data: {
        user: session.user,
        session,
        userType: profile?.user_type || 'anonymous',
        subscriptionStatus: profile?.subscription_status || null
      },
      error: null
    })
  } catch (error) {
    return NextResponse.json(
      { data: null, error: 'Internal server error' },
      { status: 500 }
    )
  }
}