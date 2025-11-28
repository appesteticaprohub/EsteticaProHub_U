//src/hooks/useSubscriptionStatus.ts

'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { apiClient } from '@/lib/api-client'

interface SubscriptionData {
  subscription_status: string | null
  subscription_expires_at: string | null
  payment_retry_count: number
  last_payment_attempt: string | null
  grace_period_ends: string | null
  auto_renewal_enabled: boolean
  paypal_subscription_id: string | null
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
    auto_renewal_enabled: false,
    paypal_subscription_id: null
  })

  // ✅ Bandera para evitar múltiples llamadas simultáneas
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)

  // ✅ FUNCIONES DEFINIDAS ANTES DEL useEffect
  const fetchInitialData = async () => {
    try {
      console.log('🔄 Fetching initial subscription data')
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
          auto_renewal_enabled: subscriptionData.auto_renewal_enabled || false,
          paypal_subscription_id: subscriptionData.paypal_subscription_id || null
        })
      }
    } catch (error) {
      console.log('Error de red en subscription status inicial:', error)
    }
  }

  // ✅ NUEVA FUNCIÓN: Solo para casos que necesitan datos adicionales
const fetchDetailedData = useCallback(async () => {
    try {
      console.log('🔄 Iniciando fetch de datos detallados...')
      const { data, error } = await apiClient.get('/subscription-status')
      
      console.log('🔄 Respuesta del API:', { data, error })
      
      if (error) {
        console.log('❌ Error fetching detailed subscription data:', error)
        setIsLoadingDetails(false)
        return
      }

      if (data && typeof data === 'object') {
        const subscriptionData = data as SubscriptionData
        console.log('🔄 Datos de suscripción recibidos:', subscriptionData)
        console.log('🔄 PayPal Subscription ID:', subscriptionData.paypal_subscription_id)
        
        setSubscriptionData({
          subscription_status: subscriptionData.subscription_status || subscriptionStatus,
          subscription_expires_at: subscriptionData.subscription_expires_at || null,
          payment_retry_count: subscriptionData.payment_retry_count || 0,
          last_payment_attempt: subscriptionData.last_payment_attempt || null,
          grace_period_ends: subscriptionData.grace_period_ends || null,
          auto_renewal_enabled: subscriptionData.auto_renewal_enabled || false,
          paypal_subscription_id: subscriptionData.paypal_subscription_id || null
        })

        // Forzar actualización inmediata si payment_retry_count cambió a 0
        if (subscriptionData.payment_retry_count === 0) {
          console.log('🔄 payment_retry_count es 0 - actualizando estado inmediatamente')
        }
        
        console.log('✅ subscriptionData actualizado con paypal_subscription_id:', subscriptionData.paypal_subscription_id)
        setIsLoadingDetails(false)
      } else {
        console.log('❌ No se recibieron datos válidos:', data)
        setIsLoadingDetails(false)
      }
    } catch (error) {
      console.log('❌ Error de red en fetchDetailedData:', error)
      setIsLoadingDetails(false)
    }
  }, [subscriptionStatus])

  // ✅ CORREGIDO: Solo hacer fetch cuando realmente sea necesario
useEffect(() => {
    if (!user || loading) {
      setSubscriptionData({
        subscription_status: null,
        subscription_expires_at: null,
        payment_retry_count: 0,
        last_payment_attempt: null,
        grace_period_ends: null,
        auto_renewal_enabled: false,
        paypal_subscription_id: null
      })
      return
    }

    if (subscriptionStatus && !isLoadingDetails) {
      const needsDetailedData = subscriptionStatus === 'Payment_Failed' || 
                               subscriptionStatus === 'Grace_Period' || 
                               subscriptionStatus === 'Suspended' ||
                               subscriptionStatus === 'Cancelled' ||
                               subscriptionStatus === 'Price_Change_Cancelled'
      
      // Solo hacer fetch si necesita datos detallados Y no los tiene aún
      if (needsDetailedData && !subscriptionData.paypal_subscription_id) {
        console.log('🔄 Fetching detailed data for status:', subscriptionStatus)
        setIsLoadingDetails(true)
        fetchDetailedData()
      } else if (!needsDetailedData) {
        // Para estados simples, usar solo datos del AuthContext
        setSubscriptionData(current => ({
          ...current,
          subscription_status: subscriptionStatus
        }))
      }
      return
    }

    // Fetch inicial solo si no hay subscriptionStatus del AuthContext
    if (!subscriptionStatus && !isLoadingDetails) {
      fetchInitialData()
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [user?.id, subscriptionStatus, isLoadingDetails])

  // ✅ Actualizar datos cuando AuthContext cambie (via Realtime)
  useEffect(() => {
    setSubscriptionData(current => ({
      ...current,
      subscription_status: subscriptionStatus
    }))
  }, [subscriptionStatus])

  // ✅ LISTENER PARA EVENTOS DE ACTUALIZACIÓN DE SUSCRIPCIÓN
  useEffect(() => {
    if (!user?.id) return

    const handleSubscriptionRefresh = () => {
      console.log('🎯 useSubscriptionStatus: Evento subscription-updated recibido - refrescando datos detallados')
      
      // Forzar refresh completo de los datos detallados
      if (!isLoadingDetails) {
        console.log('🎯 Ejecutando fetchDetailedData tras evento...')
        setIsLoadingDetails(true)
        fetchDetailedData()
      }
    }

    window.addEventListener('subscription-updated', handleSubscriptionRefresh)

    return () => {
      window.removeEventListener('subscription-updated', handleSubscriptionRefresh)
    }
  }, [user?.id, isLoadingDetails, fetchDetailedData])

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