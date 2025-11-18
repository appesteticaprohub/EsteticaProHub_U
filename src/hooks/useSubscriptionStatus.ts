'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient } from '@/lib/api-client'

interface SubscriptionData {
  subscription_status: string | null
  subscription_expires_at: string | null
  payment_retry_count: number
  last_payment_attempt: string | null
  grace_period_ends: string | null
  auto_renewal_enabled: boolean
}

export function useSubscriptionStatus() {
  const { user, subscriptionStatus, loading } = useAuth()
  
  // ✅ Obtener datos de suscripción desde AuthContext (sin requests adicionales)
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData>({
    subscription_status: null,
    subscription_expires_at: null,
    payment_retry_count: 0,
    last_payment_attempt: null,
    grace_period_ends: null,
    auto_renewal_enabled: false
  })

  // ✅ Solo hacer fetch inicial una vez, luego usar datos de AuthContext
  useEffect(() => {
    if (!user || loading) {
      setSubscriptionData({
        subscription_status: null,
        subscription_expires_at: null,
        payment_retry_count: 0,
        last_payment_attempt: null,
        grace_period_ends: null,
        auto_renewal_enabled: false
      })
      return
    }

    // Solo hacer fetch la primera vez
    const fetchInitialData = async () => {
      try {
        const { data, error } = await apiClient.get('/subscription-status')
        
        if (error) {
          console.log('Error inicial subscription status:', error)
          return
        }

        if (data && typeof data === 'object') {
          const subscriptionData = data as SubscriptionData
          setSubscriptionData({
            subscription_status: subscriptionData.subscription_status || null,
            subscription_expires_at: subscriptionData.subscription_expires_at || null,
            payment_retry_count: subscriptionData.payment_retry_count || 0,
            last_payment_attempt: subscriptionData.last_payment_attempt || null,
            grace_period_ends: subscriptionData.grace_period_ends || null,
            auto_renewal_enabled: subscriptionData.auto_renewal_enabled || false
          })
        }
      } catch (error) {
        console.log('Error de red en subscription status inicial:', error)
      }
    }

    fetchInitialData()
  }, [user?.id, loading, user]) // Solo cuando cambie el usuario, loading o user

  // ✅ Actualizar datos cuando AuthContext cambie (via Realtime)
  useEffect(() => {
    setSubscriptionData(current => ({
      ...current,
      subscription_status: subscriptionStatus
    }))
  }, [subscriptionStatus])

  // Funciones helper (sin cambios)
  const isInGracePeriod = () => {
    if (!subscriptionData.grace_period_ends) return false
    const now = new Date()
    const graceEnd = new Date(subscriptionData.grace_period_ends)
    return now <= graceEnd
  }

  const hasPaymentIssues = () => {
    return subscriptionData.subscription_status === 'Payment_Failed' ||
           subscriptionData.subscription_status === 'Suspended'
  }

  return { 
    subscriptionStatus, // Del AuthContext
    subscriptionData,   // Datos completos
    loading,           // Del AuthContext
    isInGracePeriod,
    hasPaymentIssues
  }
}