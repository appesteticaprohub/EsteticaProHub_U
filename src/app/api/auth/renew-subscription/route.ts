import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/server-supabase'

export async function POST(request: NextRequest) {
  try {
    const { external_reference, subscription_expires_at } = await request.json()
    
    if (!external_reference || !subscription_expires_at) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()
    
    // Verificar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Verificar que el payment session existe y está pagado
    const { data: session, error: sessionError } = await supabase
      .from('payment_sessions')
      .select('*')
      .eq('external_reference', external_reference)
      .eq('status', 'paid')
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Invalid or unpaid session' },
        { status: 400 }
      )
    }

    // Obtener estado anterior del usuario para detectar reactivación
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('subscription_status, email, full_name')
      .eq('id', user.id)
      .single()

    const wasInactive = currentProfile && ['Cancelled', 'Expired', 'Grace_Period', 'Payment_Failed'].includes(currentProfile.subscription_status)

    // Actualizar el perfil del usuario con nueva fecha de expiración
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        subscription_status: 'Active',
        subscription_expires_at: subscription_expires_at,
        auto_renewal_enabled: true,
        // Resetear campos de problemas de pago
        payment_retry_count: 0,
        last_payment_attempt: null,
        grace_period_ends: null
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating user profile:', updateError)
      return NextResponse.json(
        { error: 'Failed to update subscription' },
        { status: 500 }
      )
    }

    // Asociar el payment session al usuario
    const { error: linkError } = await supabase
      .from('payment_sessions')
      .update({ user_id: user.id })
      .eq('external_reference', external_reference)

    if (linkError) {
      console.error('Error linking payment session:', linkError)
      // No es crítico, el usuario ya fue actualizado
    }

    // Si era una reactivación, enviar notificación
    if (wasInactive && currentProfile) {
      const { NotificationService } = await import('@/lib/notification-service')
      const userName = currentProfile.full_name || currentProfile.email.split('@')[0]
      
      console.log('📧 Enviando notificación de reactivación...')
      await NotificationService.sendSubscriptionReactivatedNotification(
        user.id,
        currentProfile.email,
        userName
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Subscription renewed successfully'
    })

  } catch (error) {
    console.error('Renew subscription error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}