import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function isSubscriptionExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  
  const now = new Date();
  const expirationDate = new Date(expiresAt);
  
  return now > expirationDate;
}

export async function updateExpiredSubscription(userId: string) {
  const { createServerSupabaseAdminClient } = await import('./server-supabase')
  const supabase = await createServerSupabaseAdminClient()
  
  // Primero obtener el perfil completo para verificar si necesitamos cancelar en PayPal
  const { data: profile } = await supabase
    .from('profiles')
    .select('paypal_subscription_id, subscription_status, auto_renewal_enabled')
    .eq('id', userId)
    .single()
  
  // LÓGICA SIMPLIFICADA: Cualquier usuario que pase a Expired debe cancelarse en PayPal
  if (profile?.paypal_subscription_id) {
    
    console.log('🔄 Usuario expirado - cancelando en PayPal para evitar cobros futuros:', profile.paypal_subscription_id)
    
    try {
      const { cancelPayPalSubscription } = await import('./paypal')
      const response = await cancelPayPalSubscription(
        profile.paypal_subscription_id, 
        "Subscription expired - automatic cleanup to prevent future charges"
      )
      
      if (response.status === 204) {
        console.log('✅ PayPal subscription cancelled for expired cancelled user:', profile.paypal_subscription_id)
      } else {
        console.log('⚠️ Could not cancel PayPal subscription. Status:', response.status)
      }
    } catch (error) {
      console.error('⚠️ Error cancelling PayPal subscription (non-critical):', error)
      // No retornamos false porque la actualización BD sigue siendo válida
    }
  }
  
  // Actualizar estado en BD (como antes)
  const { error } = await supabase
    .from('profiles')
    .update({ 
      subscription_status: 'Expired',
      auto_renewal_enabled: false
    })
    .eq('id', userId)
  
  if (error) {
    console.error('Error updating expired subscription:', error)
    return false
  }
  
  console.log('✅ Successfully updated subscription to Expired for user:', userId)
  return true
}

export function isUserBanned(profile: { is_banned?: boolean } | null): boolean {
  if (!profile) return false;
  return profile.is_banned === true;
}

export async function getUserProfile(userId: string) {
  const cookieStore = await cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
  
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  
  if (error) {
    console.error('Error fetching user profile:', error)
    return null
  }
  
  return profile
}

// Función optimizada específica para middleware - solo campos necesarios
export async function getUserProfileForMiddleware(userId: string) {
  const cookieStore = await cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
  
  const { data: profile, error } = await supabase
    .from('profiles')
    .select(`
      id, 
      is_banned, 
      role,
      subscription_status, 
      subscription_expires_at,
      grace_period_ends
    `)
    .eq('id', userId)
    .single()
  
  if (error) {
    console.error('Error fetching user profile for middleware:', error)
    return null
  }
  
  return profile
}

// ==================== FUNCIONES PARA PAGOS RECURRENTES ====================

export async function updatePaymentFailed(userId: string, retryCount: number = 0) {
  const { createServerSupabaseAdminClient } = await import('./server-supabase')
  const supabase = await createServerSupabaseAdminClient()
  
  const now = new Date()
  
  const { error } = await supabase
    .from('profiles')
    .update({ 
      subscription_status: 'Payment_Failed',
      payment_retry_count: retryCount,
      last_payment_attempt: now.toISOString()
    })
    .eq('id', userId)
  
  if (error) {
    console.error('Error updating payment failed status:', error)
    return false
  }
  
  console.log('✅ Successfully updated payment failed status for user:', userId)
  return true
}

export async function activateGracePeriod(userId: string, graceDays: number = 7) {
  const { createServerSupabaseAdminClient } = await import('./server-supabase')
  const supabase = await createServerSupabaseAdminClient()
  
  const gracePeriodEnd = new Date()
  gracePeriodEnd.setDate(gracePeriodEnd.getDate() + graceDays)
  
  const { error } = await supabase
    .from('profiles')
    .update({ 
      subscription_status: 'Grace_Period',
      grace_period_ends: gracePeriodEnd.toISOString()
    })
    .eq('id', userId)
  
  if (error) {
    console.error('Error activating grace period:', error)
    return false
  }
  
  console.log('✅ Successfully activated grace period for user:', userId)
  return true
}

export function isInGracePeriod(gracePeriodEnd: string | null): boolean {
  if (!gracePeriodEnd) return false
  
  const now = new Date()
  const graceEnd = new Date(gracePeriodEnd)
  
  return now <= graceEnd
}

export async function getPaymentRetryInfo(userId: string) {
  const cookieStore = await cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
  
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('payment_retry_count, last_payment_attempt')
    .eq('id', userId)
    .single()
  
  if (error) {
    console.error('Error fetching payment retry info:', error)
    return null
  }
  
  return profile
}

export async function updateSuspendedStatus(userId: string) {
  const { createServerSupabaseAdminClient } = await import('./server-supabase')
  const supabase = await createServerSupabaseAdminClient()
  
  const { error } = await supabase
    .from('profiles')
    .update({ subscription_status: 'Suspended' })
    .eq('id', userId)
  
  if (error) {
    console.error('Error updating suspended status:', error)
    return false
  }
  
  console.log('✅ Successfully updated suspended status for user:', userId)
  return true
}

export async function cancelSubscription(userId: string) {
  const { createServerSupabaseAdminClient } = await import('./server-supabase')
  const supabase = await createServerSupabaseAdminClient()
  
  const { error } = await supabase
    .from('profiles')
    .update({ 
      subscription_status: 'Cancelled',
      auto_renewal_enabled: false
      // Mantenemos subscription_expires_at para conservar acceso hasta esa fecha
    })
    .eq('id', userId)
  
  if (error) {
    console.error('Error cancelling subscription:', error)
    return false
  }
  
  console.log('✅ Successfully cancelled subscription for user:', userId)
  return true
}

export async function reactivateSubscription(userId: string) {
  const { createServerSupabaseAdminClient } = await import('./server-supabase')
  const supabase = await createServerSupabaseAdminClient()
  
  const { error } = await supabase
    .from('profiles')
    .update({ 
      subscription_status: 'Active',
      auto_renewal_enabled: true
    })
    .eq('id', userId)
  
  if (error) {
    console.error('Error reactivating subscription:', error)
    return false
  }

  // 🧹 LIMPIAR NOTIFICACIONES OBSOLETAS
  try {
    const { NotificationService } = await import('./notification-service')
    console.log('🧹 Limpiando notificaciones obsoletas tras reactivación...')
    await NotificationService.clearPaymentNotifications(userId)
    await NotificationService.clearCancellationNotifications(userId)
  } catch (error) {
    console.error('⚠️ Error limpiando notificaciones (no crítico):', error)
    // No retornamos false porque la reactivación fue exitosa
  }
  
  console.log('✅ Successfully reactivated subscription for user:', userId)
  return true
}

// Función helper para detectar si hubo cambio de precio desde el último pago
export async function hasPriceChangedSinceLastPayment(userId: string): Promise<boolean> {
  const cookieStore = await cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
  
  try {
    // Obtener el precio actual del sistema
    const { data: settings } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'SUBSCRIPTION_PRICE')
      .single()
    
    // Obtener el último precio que pagó el usuario
    const { data: profile } = await supabase
      .from('profiles')
      .select('last_payment_amount')
      .eq('id', userId)
      .single()
    
    if (!settings || !profile) {
      console.log('⚠️ No se pudo obtener precio actual o último pago del usuario')
      return false
    }
    
    const currentPrice = parseFloat(settings.value)
    const lastPaymentAmount = profile.last_payment_amount || 0
    
    const hasChanged = currentPrice !== lastPaymentAmount && lastPaymentAmount > 0
    
    console.log(`💰 Detección cambio de precio para usuario ${userId}:`)
    console.log(`   Precio actual: $${currentPrice}`)
    console.log(`   Último pago: $${lastPaymentAmount}`)
    console.log(`   ¿Cambió?: ${hasChanged}`)
    
    return hasChanged
    
  } catch (error) {
    console.error('Error detectando cambio de precio:', error)
    return false
  }
}

// Función helper para validar acceso válido (backend)
export async function hasValidSubscriptionAccess(userId: string): Promise<boolean> {
  const cookieStore = await cookies()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
  
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('subscription_status, subscription_expires_at')
    .eq('id', userId)
    .single()
  
  if (error || !profile) return false
  
  // Usuario con suscripción activa
  if (profile.subscription_status === 'Active') return true
  
  // Usuario cancelado pero con fecha válida
  if (profile.subscription_status === 'Cancelled' && profile.subscription_expires_at) {
    const now = new Date()
    const expirationDate = new Date(profile.subscription_expires_at)
    return now <= expirationDate
  }

  // Usuario con pago fallido pero con fecha válida
if (profile.subscription_status === 'Payment_Failed' && profile.subscription_expires_at) {
  const now = new Date()
  const expirationDate = new Date(profile.subscription_expires_at)
  return now <= expirationDate
}

// Usuario en período de gracia pero con fecha válida
if (profile.subscription_status === 'Grace_Period' && profile.subscription_expires_at) {
  const now = new Date()
  const expirationDate = new Date(profile.subscription_expires_at)
  return now <= expirationDate
}
  
  // Usuario suspendido pero con fecha válida
  if (profile.subscription_status === 'Suspended' && profile.subscription_expires_at) {
    const now = new Date()
    const expirationDate = new Date(profile.subscription_expires_at)
    return now <= expirationDate
  }
  // Usuario cancelado por cambio de precio pero con fecha válida
  if (profile.subscription_status === 'Price_Change_Cancelled' && profile.subscription_expires_at) {
    const now = new Date()
    const expirationDate = new Date(profile.subscription_expires_at)
    return now <= expirationDate
  }
  
  return false
}