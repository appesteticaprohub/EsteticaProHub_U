import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function isSubscriptionExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  
  const now = new Date();
  const expirationDate = new Date(expiresAt);
  
  return now > expirationDate;
}

export async function updateExpiredSubscription(userId: string) {
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
  
  const { error } = await supabase
    .from('profiles')
    .update({ subscription_status: 'Expired' })
    .eq('id', userId)
    .eq('subscription_status', 'Active') // Solo si actualmente está Active
  
  if (error) {
    console.error('Error updating expired subscription:', error)
    return false
  }
  
  return true
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

// ==================== FUNCIONES PARA PAGOS RECURRENTES ====================

export async function updatePaymentFailed(userId: string, retryCount: number = 0) {
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
  
  return true
}

export async function activateGracePeriod(userId: string, graceDays: number = 7) {
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
  
  const { error } = await supabase
    .from('profiles')
    .update({ subscription_status: 'Suspended' })
    .eq('id', userId)
  
  if (error) {
    console.error('Error updating suspended status:', error)
    return false
  }
  
  return true
}