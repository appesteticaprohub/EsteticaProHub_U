'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'

interface AvatarUploaderProps {
  currentAvatarUrl: string | null
  fullName: string | null
  userEmail: string
  onUploadSuccess: (avatarUrl: string) => void
  onDeleteSuccess: () => void
}


export default function AvatarUploader({ 
  currentAvatarUrl,
  fullName,
  userEmail,
  onUploadSuccess, 
  onDeleteSuccess 
}: AvatarUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const getInitials = (name: string | null, email: string) => {
    if (name && name.trim()) {
      const nameParts = name.trim().split(' ')
      if (nameParts.length >= 2) {
        return (nameParts[0][0] + nameParts[1][0]).toUpperCase()
      }
      return name.substring(0, 2).toUpperCase()
    }
    return email.substring(0, 2).toUpperCase()
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validaciones en el cliente
    const maxSize = 5 * 1024 * 1024 // 5MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

    if (!allowedTypes.includes(file.type)) {
      setError('Formato no permitido. Solo JPG, PNG y WEBP.')
      return
    }

    if (file.size > maxSize) {
      setError('El archivo es muy grande. Máximo 5MB.')
      return
    }

    setError(null)
    setUploading(true)

    try {
      // Crear preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string)
      }
      reader.readAsDataURL(file)

      // Subir archivo
      const formData = new FormData()
      formData.append('avatar', file)

      const response = await fetch('/api/profile/avatar/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al subir avatar')
      }

      onUploadSuccess(result.data.avatar_url)
      setPreviewUrl(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir avatar')
      setPreviewUrl(null)
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    setError(null)
    setShowDeleteConfirm(false)

    try {
      const response = await fetch('/api/profile/avatar/delete', {
        method: 'DELETE',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Error al eliminar avatar')
      }

      onDeleteSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar avatar')
    } finally {
      setDeleting(false)
    }
  }

  const displayUrl = previewUrl || currentAvatarUrl

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700">
        Foto de Perfil
      </label>

      <div className="flex items-center gap-6">
        {/* Avatar Preview */}
        <div className="relative">
          {displayUrl ? (
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200">
              <Image
                src={displayUrl}
                alt="Avatar"
                width={96}
                height={96}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold border-2 border-gray-200">
              {getInitials(fullName, userEmail)}
            </div>
          )}
          
          {uploading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>

        {/* Botones */}
        <div className="flex flex-col gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading || deleting}
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || deleting}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            {uploading ? 'Subiendo...' : currentAvatarUrl ? 'Cambiar Avatar' : 'Subir Avatar'}
          </button>

          {currentAvatarUrl && !uploading && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              {deleting ? 'Eliminando...' : 'Eliminar Avatar'}
            </button>
          )}
        </div>
      </div>

      {/* Información */}
      <p className="text-sm text-gray-500">
        Formatos permitidos: JPG, PNG, WEBP. Tamaño máximo: 5MB.
      </p>

      {/* Errores */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}

      {/* Modal de confirmación */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              ¿Eliminar avatar?
            </h3>
            <p className="text-gray-600 mb-6">
              Esta acción no se puede deshacer. Tu foto de perfil será eliminada permanentemente.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-md font-medium transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}