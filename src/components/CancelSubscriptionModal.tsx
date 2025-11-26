'use client'
import { useState } from 'react'
import Modal from './Modal'

interface CancelSubscriptionModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  subscriptionExpiresAt: string | null
}

export default function CancelSubscriptionModal({
  isOpen,
  onClose,
  onConfirm,
  subscriptionExpiresAt
}: CancelSubscriptionModalProps) {
  const [isLoading, setIsLoading] = useState(false)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const handleConfirm = async () => {
    setIsLoading(true)
    try {
      await onConfirm()
      onClose()
    } catch (error) {
      console.error('Error cancelando suscripción:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-6 rounded-lg border-2 border-red-200 bg-red-50">
        <h2 className="text-xl font-bold mb-4 text-gray-800">
          ¿Pausar renovación automática?
        </h2>
        
        <div className="mb-6 space-y-3">
          <p className="text-gray-700">
            Si pausas la renovación automática:
          </p>
                    
          <ul className="list-disc list-inside text-gray-600 space-y-1 ml-4">
            <li>La renovación automática se pausará</li>
              <li>Conservarás acceso premium hasta {subscriptionExpiresAt ? formatDate(subscriptionExpiresAt) : 'la fecha de expiración'}</li>
              <li>Puedes reactivar la renovación cuando quieras</li>
              <li>Si no reactivas, perderás acceso después de esa fecha</li>
          </ul>
          
          <div className="mt-4 p-3 bg-white rounded border border-red-300">
            <p className="text-sm text-red-700">
              <strong>Importante:</strong> Esta acción cancelará la renovación automática, pero mantendrás acceso hasta {subscriptionExpiresAt ? formatDate(subscriptionExpiresAt) : 'tu fecha de expiración'}.
            </p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className={`px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium transition-colors ${
              isLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isLoading ? 'Cancelando...' : 'Sí, cancelar suscripción'}
          </button>
          
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Mantener suscripción
          </button>
        </div>
      </div>
    </Modal>
  )
}