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
  const { user } = useAuth()
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData>({
    subscription_status: null,
    subscription_expires_at: null,
    payment_retry_count: 0,
    last_payment_attempt: null,
    grace_period_ends: null,
    auto_renewal_enabled: false
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setSubscriptionData({
        subscription_status: null,
        subscription_expires_at: null,
        payment_retry_count: 0,
        last_payment_attempt: null,
        grace_period_ends: null,
        auto_renewal_enabled: false
      })
      setLoading(false)
      return
    }

    const fetchStatus = async () => {
      try {
        const { data, error } = await apiClient.get('/subscription-status')
        
        if (error) {
          console.error('Error fetching subscription status:', error)
          setSubscriptionData({
            subscription_status: null,
            subscription_expires_at: null,
            payment_retry_count: 0,
            last_payment_attempt: null,
            grace_period_ends: null,
            auto_renewal_enabled: false
          })
        } else if (data && typeof data === 'object') {
          const subscriptionData = data as SubscriptionData // Usar el tipo específico definido
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
        console.error('Error fetching subscription status:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStatus()
  }, [user])

  // Mantener compatibilidad hacia atrás
  const subscriptionStatus = subscriptionData.subscription_status

  // Funciones helper para nuevos estados
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
    subscriptionStatus, // Mantener para compatibilidad
    subscriptionData,   // Nueva data completa
    loading,
    isInGracePeriod,
    hasPaymentIssues
  }
}