'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient } from '@/lib/api-client'

export function useSubscriptionStatus() {
  const { user } = useAuth()
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setSubscriptionStatus(null)
      setLoading(false)
      return
    }

    const fetchStatus = async () => {
      try {
        const { data, error } = await apiClient.get('/subscription-status')
        
        if (error) {
          console.error('Error fetching subscription status:', error)
        } else if (data && typeof data === 'object' && 'subscription_status' in data) {
          setSubscriptionStatus(data.subscription_status as string || null)
        } else {
          setSubscriptionStatus(null)
        }
      } catch (error) {
        console.error('Error fetching subscription status:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStatus()
  }, [user])

  return { subscriptionStatus, loading }
}