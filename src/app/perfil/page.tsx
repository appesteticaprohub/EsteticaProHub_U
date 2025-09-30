'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus'
import PaymentRecoveryModal from '@/components/PaymentRecoveryModal'
import { useState, useEffect } from 'react'
import type { NotificationPreferences } from '@/types/notifications'
import CancelSubscriptionModal from '@/components/CancelSubscriptionModal'



export default function MiPerfil() {
  const { user, signOut, loading } = useAuth()
  const { subscriptionStatus, subscriptionData, loading: statusLoading } = useSubscriptionStatus()
  const router = useRouter()
  const [showPaymentRecoveryModal, setShowPaymentRecoveryModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'perfil' | 'notificaciones'>('perfil')
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [loadingPreferences, setLoadingPreferences] = useState(false)
  const [savingPreferences, setSavingPreferences] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  const handleCancelSubscription = async () => {
  try {
    const response = await fetch('/api/paypal/cancel-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()

    if (response.ok) {
      // Recargar la página para mostrar el nuevo estado
      window.location.reload()
    } else {
      console.error('Error:', data.error)
      alert('Error cancelando suscripción: ' + data.error)
    }
  } catch (error) {
    console.error('Error:', error)
    alert('Error cancelando suscripción')
  }
}

const loadPreferences = async () => {
  setLoadingPreferences(true)
  try {
    const response = await fetch('/api/notifications/preferences')
    if (response.ok) {
      const result = await response.json()
      setPreferences(result.data)
    } else {
      console.error('Error loading preferences:', response.status)
    }
  } catch (error) {
    console.error('Error loading preferences:', error)
  } finally {
    setLoadingPreferences(false)
  }
}

const handlePreferenceChange = (key: keyof NotificationPreferences, value: boolean) => {
  if (preferences) {
    setPreferences({ ...preferences, [key]: value })
  }
}

const savePreferences = async () => {
  if (!preferences) return
  
  setSavingPreferences(true)
  try {
    const response = await fetch('/api/notifications/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email_promotional: preferences.email_promotional,
        email_content: preferences.email_content,
        in_app_notifications: preferences.in_app_notifications,
      }),
    })

    if (response.ok) {
      const result = await response.json()
      setPreferences(result.data)
      // Opcional: podrías agregar un toast notification aquí en el futuro
    } else {
      alert('Error al guardar preferencias')
    }
  } catch (error) {
    console.error('Error saving preferences:', error)
    alert('Error al guardar preferencias')
  } finally {
    setSavingPreferences(false)
  }
}

const handleReactivateSubscription = async () => {
  try {
    const response = await fetch('/api/paypal/reactivate-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()

    if (response.ok) {
      // Recargar la página para mostrar el nuevo estado
      window.location.reload()
    } else {
      console.error('Error:', data.error)
      alert('Error reactivando suscripción: ' + data.error)
    }
  } catch (error) {
    console.error('Error:', error)
    alert('Error reactivando suscripción')
  }
}

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  useEffect(() => {
  if (user && activeTab === 'notificaciones') {
    loadPreferences()
  }
}, [user, activeTab])

  if (loading || statusLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Cargando...</div>
      </main>
    )
  }

  if (!user) {
    return null
  }

  return (
    <>
      <PaymentRecoveryModal 
        isOpen={showPaymentRecoveryModal}
        onClose={() => setShowPaymentRecoveryModal(false)}
        subscriptionStatus={subscriptionStatus || ''}
        paymentRetryCount={subscriptionData.payment_retry_count}
        gracePeriodEnds={subscriptionData.grace_period_ends}
      />

      <CancelSubscriptionModal
      isOpen={showCancelModal}
      onClose={() => setShowCancelModal(false)}
      onConfirm={handleCancelSubscription}
      subscriptionExpiresAt={subscriptionData.subscription_expires_at}
    />
      
      <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">
              Mi Perfil
            </h1>

            {/* Pestañas */}
            <div className="flex border-b border-gray-200 mb-8">
              <button
                onClick={() => setActiveTab('perfil')}
                className={`px-6 py-3 font-medium transition-colors ${
                  activeTab === 'perfil'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Perfil
              </button>
              <button
                onClick={() => setActiveTab('notificaciones')}
                className={`px-6 py-3 font-medium transition-colors ${
                  activeTab === 'notificaciones'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Notificaciones
              </button>
            </div>

            {/* Contenido Pestaña Perfil */}
            {activeTab === 'perfil' && (
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div className="text-lg text-gray-900 bg-gray-50 px-4 py-3 rounded-md">
                  {user.email}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ID de Usuario
                </label>
                <div className="text-lg text-gray-900 bg-gray-50 px-4 py-3 rounded-md font-mono text-sm">
                  {user.id}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estado de Suscripción
                </label>
                <div className="flex items-center gap-3">
                  <div className={`text-lg font-medium px-4 py-3 rounded-md ${
                    subscriptionStatus === 'Active' ? 'bg-green-100 text-green-800' :
                    subscriptionStatus === 'Grace_Period' ? 'bg-yellow-100 text-yellow-800' :
                    subscriptionStatus === 'Payment_Failed' ? 'bg-orange-100 text-orange-800' :
                    subscriptionStatus === 'Suspended' ? 'bg-red-100 text-red-800' :
                    subscriptionStatus === 'Expired' ? 'bg-gray-100 text-gray-800' :
                    subscriptionStatus === 'Cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-gray-50 text-gray-900'
                  }`}>
                    {subscriptionStatus === 'Active' ? 'Activa' :
                     subscriptionStatus === 'Grace_Period' ? 'Período de Gracia' :
                     subscriptionStatus === 'Payment_Failed' ? 'Problema de Pago' :
                     subscriptionStatus === 'Suspended' ? 'Suspendida' :
                     subscriptionStatus === 'Expired' ? 'Expirada' :
                     subscriptionStatus === 'Cancelled' ? 'Cancelada' :
                     subscriptionStatus || 'No disponible'}
                  </div>
                  
                  {(subscriptionStatus === 'Payment_Failed' || 
                    subscriptionStatus === 'Grace_Period' || 
                    subscriptionStatus === 'Suspended') && (
                    <button
                      onClick={() => setShowPaymentRecoveryModal(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm transition-colors"
                    >
                      Resolver
                    </button>
                  )}

                  {subscriptionStatus === 'Active' && (
                    <button
                      onClick={() => setShowCancelModal(true)}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm transition-colors"
                    >
                      Cancelar Suscripción
                    </button>
                  )}

                  {subscriptionStatus === 'Cancelled' && subscriptionData.subscription_expires_at && (
                    <div className="mt-2 space-y-2">
                      <div className="text-sm text-gray-600">
                        Acceso hasta: {formatDate(subscriptionData.subscription_expires_at)}
                      </div>
                      {(() => {
                        const now = new Date();
                        const expirationDate = new Date(subscriptionData.subscription_expires_at);
                        return now <= expirationDate ? (
                          <button
                            onClick={handleReactivateSubscription}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm transition-colors"
                          >
                            Reactivar Suscripción
                          </button>
                        ) : null;
                      })()}
                    </div>
                  )}
                </div>
              </div>

              {subscriptionData.subscription_expires_at && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha de Expiración
                  </label>
                  <div className="text-lg text-gray-900 bg-gray-50 px-4 py-3 rounded-md">
                    {formatDate(subscriptionData.subscription_expires_at)}
                  </div>
                </div>
              )}

              {subscriptionData.payment_retry_count > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Intentos de Pago
                  </label>
                  <div className="text-lg text-orange-600 bg-orange-50 px-4 py-3 rounded-md">
                    {subscriptionData.payment_retry_count} intento{subscriptionData.payment_retry_count !== 1 ? 's' : ''} fallido{subscriptionData.payment_retry_count !== 1 ? 's' : ''}
                  </div>
                </div>
              )}

              {subscriptionData.grace_period_ends && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Período de Gracia Termina
                  </label>
                  <div className="text-lg text-yellow-600 bg-yellow-50 px-4 py-3 rounded-md">
                    {formatDate(subscriptionData.grace_period_ends)}
                  </div>
                </div>
              )}
            </div>
            )}

            {/* Contenido Pestaña Notificaciones */}
              {activeTab === 'notificaciones' && (
                <div className="space-y-6">
                  {loadingPreferences ? (
                    <div className="text-center py-8">
                      <div className="text-lg text-gray-600">Cargando preferencias...</div>
                    </div>
                  ) : preferences ? (
                    <>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                        <p className="text-sm text-blue-800">
                          Configura cómo deseas recibir notificaciones. Los emails administrativos (pagos, cambios de precio, etc.) siempre se enviarán.
                        </p>
                      </div>

                      {/* Email Promocional */}
                      <div className="flex items-center justify-between py-4 border-b border-gray-200">
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-gray-900">Emails Promocionales</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            Recibe ofertas, descuentos y promociones especiales por email
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer ml-4">
                          <input
                            type="checkbox"
                            checked={preferences.email_promotional}
                            onChange={(e) => handlePreferenceChange('email_promotional', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      {/* Email Contenido (Newsletter) */}
                      <div className="flex items-center justify-between py-4 border-b border-gray-200">
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-gray-900">Newsletter con Posts</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            Recibe resúmenes de los posts más recientes de la comunidad
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer ml-4">
                          <input
                            type="checkbox"
                            checked={preferences.email_content}
                            onChange={(e) => handlePreferenceChange('email_content', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      {/* Notificaciones In-App */}
                      <div className="flex items-center justify-between py-4 border-b border-gray-200">
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-gray-900">Notificaciones en la App</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            Recibe notificaciones dentro de la plataforma
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer ml-4">
                          <input
                            type="checkbox"
                            checked={preferences.in_app_notifications}
                            onChange={(e) => handlePreferenceChange('in_app_notifications', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      {/* Email Administrativo (bloqueado) */}
                      <div className="flex items-center justify-between py-4 border-b border-gray-200 opacity-60">
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-gray-900">Emails Administrativos</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            Notificaciones importantes sobre pagos, suscripción y cambios de precio (siempre activo)
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-not-allowed ml-4">
                          <input
                            type="checkbox"
                            checked={preferences.email_administrative}
                            disabled
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-400"></div>
                        </label>
                      </div>

                      {/* Botón Guardar */}
                      <div className="pt-4">
                        <button
                          onClick={savePreferences}
                          disabled={savingPreferences}
                          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-6 rounded-md transition duration-200"
                        >
                          {savingPreferences ? 'Guardando...' : 'Guardar Preferencias'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-lg text-gray-600">Error al cargar preferencias</div>
                    </div>
                  )}
                </div>
              )}
            
            <div className="mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={handleSignOut}
                className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-6 rounded-md transition duration-200"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
    </>
  )
}