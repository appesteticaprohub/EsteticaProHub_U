import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/server-supabase'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { data: null, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Obtener estado de suscripción con campos adicionales
    const { data: profile, error } = await supabase
      .from('profiles')
      .select(`
        subscription_status,
        subscription_expires_at,
        payment_retry_count,
        last_payment_attempt,
        grace_period_ends,
        auto_renewal_enabled
      `)
      .eq('id', user.id)
      .single()

    if (error) {
      return NextResponse.json(
        { data: null, error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      data: {
        subscription_status: profile?.subscription_status || null,
        subscription_expires_at: profile?.subscription_expires_at || null,
        payment_retry_count: profile?.payment_retry_count || 0,
        last_payment_attempt: profile?.last_payment_attempt || null,
        grace_period_ends: profile?.grace_period_ends || null,
        auto_renewal_enabled: profile?.auto_renewal_enabled || false
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