// src/app/api/auth/signup/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/server-supabase'
import { createClient } from '@supabase/supabase-js'
import { NotificationService } from '@/lib/notification-service'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    // Usar service role para operaciones administrativas durante el signup
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { email, password, fullName, specialty, country, birthDate, paymentReference } = await request.json()
    
    if (!email || !password) {
      return NextResponse.json(
        { data: null, error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })

    if (error) {
      return NextResponse.json(
        { data: null, error: error.message },
        { status: 400 }
      )
    }

    // Si el registro fue exitoso y tenemos un usuario, actualizar el perfil
    if (data.user) {
      const updateData: {
        full_name?: string;
        specialty?: string;
        country?: string;
        birth_date?: string;
      } = {}

      // Solo agregar campos si tienen valor
      if (fullName) updateData.full_name = fullName
      if (specialty) updateData.specialty = specialty
      if (country) updateData.country = country
      if (birthDate) updateData.birth_date = birthDate

      // Actualizar el perfil existente (creado por trigger)
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update(updateData)
        .eq('id', data.user.id)

      if (profileError) {
        console.error('Error updating profile:', profileError)
      }

      // Asociar payment session con el nuevo usuario si existe paymentReference
      if (paymentReference) {
        const { error: sessionError } = await supabaseAdmin
          .from('payment_sessions')
          .update({ user_id: data.user.id })
          .eq('external_reference', paymentReference)

        if (sessionError) {
          console.error('Error associating payment session with user:', sessionError)
        } else {
          console.log('Payment session associated with user:', data.user.id)
          
          // Verificar si la sesión está pagada y actualizar perfil del usuario
          const { data: sessionData, error: sessionFetchError } = await supabaseAdmin
            .from('payment_sessions')
            .select('status, subscription_type')
            .eq('external_reference', paymentReference)
            .single()

          if (!sessionFetchError && sessionData && (sessionData.status === 'paid' || sessionData.status === 'active_subscription')) {
            // Obtener la sesión completa con paypal_subscription_id
            const { data: fullSessionData, error: fullSessionError } = await supabaseAdmin
              .from('payment_sessions')
              .select('*')
              .eq('external_reference', paymentReference)
              .single()

            // Calcular fecha de expiración (1 mes desde ahora)
            const expirationDate = new Date();
            expirationDate.setMonth(expirationDate.getMonth() + 1);

            const profileUpdateData: Record<string, unknown> = {
              subscription_status: 'Active',
              subscription_expires_at: expirationDate.toISOString(),
              user_type: 'premium',
              auto_renewal_enabled: sessionData.subscription_type === 'recurring'
            }

            // CRÍTICO: Transferir paypal_subscription_id si existe
            if (!fullSessionError && fullSessionData?.paypal_subscription_id) {
              profileUpdateData.paypal_subscription_id = fullSessionData.paypal_subscription_id;
              console.log(`📄 Transferring PayPal subscription ID: ${fullSessionData.paypal_subscription_id} to user: ${data.user.id}`);
            }

            const { error: profileSubscriptionError } = await supabaseAdmin
              .from('profiles')
              .update(profileUpdateData)
              .eq('id', data.user.id)

            if (profileSubscriptionError) {
              console.error('Error updating profile subscription info:', profileSubscriptionError)
            } else {
              console.log('✅ Profile updated with subscription info for user:', data.user.id)
              if (fullSessionData?.paypal_subscription_id) {
                console.log(`✅ PayPal Subscription ID transferred successfully: ${fullSessionData.paypal_subscription_id}`)
              }

              // NUEVO: Procesar cualquier pago pendiente que haya llegado antes del registro
              if (fullSessionData?.paypal_subscription_id) {
                console.log('🔍 Checking for pending payments for this subscription...')
                
                // Simular el procesamiento del pago que pudo haber llegado antes
                // Esto maneja el caso donde el webhook llegó antes del registro
                const { error: paymentProcessingError } = await supabaseAdmin
                  .from('profiles')
                  .update({
                    last_payment_amount: fullSessionData.amount || null,
                    last_payment_date: new Date().toISOString()
                  })
                  .eq('id', data.user.id)

                if (paymentProcessingError) {
                  console.error('❌ Error updating payment info during registration:', paymentProcessingError)
                } else {
                  console.log('✅ Payment info updated during registration')
                }
              }
            }
          }
        }
      }

      // Enviar email de bienvenida SIEMPRE (independiente del pago)
      try {
        const welcomeResult = await NotificationService.sendWelcomeEmail(
          data.user.id,
          data.user.email || email,
          fullName || data.user.email?.split('@')[0] || 'Usuario'
        )
        
        if (welcomeResult.success) {
          console.log('✅ Email de bienvenida enviado a:', email)
        } else {
          console.error('❌ Error enviando email de bienvenida:', welcomeResult.error)
        }
      } catch (emailError) {
        console.error('❌ Error en servicio de email de bienvenida:', emailError)
      }
    }

    // Verificar que el usuario fue creado exitosamente
    if (!data.user) {
      return NextResponse.json(
        { data: null, error: 'User creation failed' },
        { status: 400 }
      )
    }

    // Después del registro exitoso, obtener datos completos del perfil
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select(`
        user_type,
        subscription_status,
        subscription_expires_at,
        is_banned,
        avatar_url,
        full_name,
        specialty,
        country,
        payment_retry_count,
        grace_period_ends,
        auto_renewal_enabled
      `)
      .eq('id', data.user.id)
      .single()

    return NextResponse.json({
      data: {
        user: data.user,
        session: data.session,
        userType: profile?.user_type || 'premium',
        subscriptionStatus: profile?.subscription_status || 'Active',
        isBanned: profile?.is_banned || false,
        avatarUrl: profile?.avatar_url || null,
        fullName: profile?.full_name || null,
        specialty: profile?.specialty || null,
        country: profile?.country || null,
        subscriptionData: {
          subscription_expires_at: profile?.subscription_expires_at || null,
          payment_retry_count: profile?.payment_retry_count || 0,
          grace_period_ends: profile?.grace_period_ends || null,
          auto_renewal_enabled: profile?.auto_renewal_enabled || false
        }
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