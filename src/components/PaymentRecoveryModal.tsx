'use client'
import { useState } from 'react'
import Modal from './Modal'

interface PaymentRecoveryModalProps {
  isOpen: boolean
  onClose: () => void
  subscriptionStatus: string
  paymentRetryCount: number
  gracePeriodEnds: string | null
}

export default function PaymentRecoveryModal({
  isOpen,
  onClose,
  subscriptionStatus,
  paymentRetryCount,
  gracePeriodEnds
}: PaymentRecoveryModalProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleUpdatePaymentMethod = async () => {
    setIsLoading(true)
    // TODO: Implementar redirección a PayPal para actualizar método de pago
    console.log('Redirigir a actualización de método de pago')
    setIsLoading(false)
  }

  const getModalContent = () => {
    switch (subscriptionStatus) {
      case 'Payment_Failed':
        return {
          title: 'Problema con el pago',
          message: `Hemos intentado procesar tu pago ${paymentRetryCount} ${paymentRetryCount === 1 ? 'vez' : 'veces'} sin éxito. Por favor actualiza tu método de pago para mantener tu suscripción activa.`,
          buttonText: 'Actualizar método de pago',
          urgency: paymentRetryCount >= 2 ? 'high' : 'medium'
        }
      
      case 'Grace_Period':
        const daysLeft = gracePeriodEnds ? 
          Math.ceil((new Date(gracePeriodEnds).getTime() - new Date().getTime()) / (1000 * 3600 * 24)) : 0
        
        return {
          title: 'Período de gracia activo',
          message: `Tu suscripción está en período de gracia. Tienes ${daysLeft} ${daysLeft === 1 ? 'día' : 'días'} para actualizar tu método de pago antes de que se suspenda el acceso.`,
          buttonText: 'Actualizar método de pago',
          urgency: daysLeft <= 2 ? 'high' : 'medium'
        }
      
      case 'Suspended':
        return {
          title: 'Suscripción suspendida',
          message: 'Tu suscripción ha sido suspendida debido a problemas de pago. Actualiza tu método de pago para reactivar tu acceso premium.',
          buttonText: 'Reactivar suscripción',
          urgency: 'high'
        }
      
      default:
        return {
          title: 'Estado de suscripción',
          message: 'Hay un problema con tu suscripción.',
          buttonText: 'Contactar soporte',
          urgency: 'medium'
        }
    }
  }

  const content = getModalContent()
  const urgencyStyles: Record<string, string> = {
    high: 'border-red-200 bg-red-50',
    medium: 'border-yellow-200 bg-yellow-50',
    low: 'border-blue-200 bg-blue-50'
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className={`p-6 rounded-lg border-2 ${urgencyStyles[content.urgency]}`}>
        <h2 className="text-xl font-bold mb-4 text-gray-800">
          {content.title}
        </h2>
        
        <p className="text-gray-600 mb-6">
          {content.message}
        </p>
        
        {subscriptionStatus === 'Grace_Period' && (
          <div className="mb-4 p-3 bg-white rounded border border-yellow-300">
            <p className="text-sm text-yellow-700">
              <strong>Nota:</strong> Puedes seguir usando todas las funciones premium durante el período de gracia.
            </p>
          </div>
        )}
        
        <div className="flex gap-3">
          <button
            onClick={handleUpdatePaymentMethod}
            disabled={isLoading}
            className={`px-6 py-2 rounded font-medium transition-colors ${
              content.urgency === 'high' 
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoading ? 'Procesando...' : content.buttonText}
          </button>
          
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  )
}