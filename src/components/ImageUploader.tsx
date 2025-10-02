'use client'

import { useState, useRef, ChangeEvent } from 'react'
import { ImageSettings } from '@/types/api'
import { useImageUpload } from '@/hooks/useImageUpload'
import { validateImage, formatFileSize } from '@/lib/image-utils'

interface ImageUploaderProps {
  settings: ImageSettings
  onImagesUploaded: (urls: string[]) => void
  disabled?: boolean
}

interface PreviewImage {
  file: File
  preview: string
}

export default function ImageUploader({ 
  settings, 
  onImagesUploaded,
  disabled = false 
}: ImageUploaderProps) {
  const [previews, setPreviews] = useState<PreviewImage[]>([])
  const [validationError, setValidationError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const { uploadImages, uploading, progress, error, clearError } = useImageUpload(settings)

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setValidationError(null)
    clearError()

    // Validar cantidad total
    if (previews.length + files.length > settings.max_images_per_post) {
      setValidationError(`Máximo ${settings.max_images_per_post} imágenes por post`)
      return
    }

    // Validar cada archivo
    for (const file of files) {
      const validation = validateImage(
        file, 
        settings.max_image_size_mb, 
        settings.allowed_formats
      )
      
      if (!validation.valid) {
        setValidationError(validation.error || 'Error de validación')
        return
      }
    }

    // Crear previews
    const newPreviews: PreviewImage[] = files.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }))

    setPreviews(prev => [...prev, ...newPreviews])
  }

  const handleRemovePreview = (index: number) => {
    setPreviews(prev => {
      const updated = [...prev]
      URL.revokeObjectURL(updated[index].preview)
      updated.splice(index, 1)
      return updated
    })
    setValidationError(null)
    clearError()
  }

  const handleUpload = async () => {
    if (previews.length === 0) return

    try {
      const files = previews.map(p => p.file)
      const urls = await uploadImages(files)
      
      // Limpiar previews
      previews.forEach(p => URL.revokeObjectURL(p.preview))
      setPreviews([])
      
      // Notificar al componente padre
      onImagesUploaded(urls)
      
    } catch (err) {
      console.error('Error al subir imágenes:', err)
    }
  }

  const handleClickInput = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  return (
    <div className="space-y-4">
      {/* Input oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept={settings.allowed_formats.join(',')}
        multiple
        onChange={handleFileSelect}
        disabled={disabled || uploading}
        className="hidden"
      />

      {/* Área de selección */}
      <div>
        <button
          type="button"
          onClick={handleClickInput}
          disabled={disabled || uploading || previews.length >= settings.max_images_per_post}
          className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="text-gray-600">
            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="mt-2 text-sm">
              {previews.length >= settings.max_images_per_post 
                ? `Máximo ${settings.max_images_per_post} imágenes alcanzado`
                : 'Haz clic para seleccionar imágenes'
              }
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Máximo {settings.max_image_size_mb}MB por imagen - {settings.max_images_per_post} imágenes máximo
            </p>
          </div>
        </button>
      </div>

      {/* Errores */}
      {(validationError || error) && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {validationError || error}
        </div>
      )}

      {/* Previews */}
      {previews.length > 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {previews.map((preview, index) => (
              <div key={index} className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview.preview}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => handleRemovePreview(index)}
                  disabled={uploading}
                  className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                  {formatFileSize(preview.file.size)}
                </div>
              </div>
            ))}
          </div>

          {/* Barra de progreso */}
          {uploading && (
            <div className="space-y-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-gray-600 text-center">
                Subiendo imágenes... {Math.round(progress)}%
              </p>
            </div>
          )}

          {/* Botón de subir */}
          {!uploading && (
            <button
              type="button"
              onClick={handleUpload}
              disabled={disabled}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Subir {previews.length} {previews.length === 1 ? 'imagen' : 'imágenes'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}