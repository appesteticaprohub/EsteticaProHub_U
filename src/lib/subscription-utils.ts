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