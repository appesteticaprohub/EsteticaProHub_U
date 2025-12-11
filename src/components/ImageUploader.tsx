'use client'

import { useState, useRef, ChangeEvent, useEffect } from 'react'
import { ImageSettings } from '@/types/api'
import { validateImage, formatFileSize } from '@/lib/image-utils'

interface ImageUploaderProps {
  settings: ImageSettings
  onFilesSelected: (files: File[]) => void  // ← CAMBIO: retorna Files, no URLs
  disabled?: boolean
}

interface PreviewImage {
  file: File
  preview: string
}

export default function ImageUploader({ 
  settings, 
  onFilesSelected,
  disabled = false 
}: ImageUploaderProps) {
  const [previews, setPreviews] = useState<PreviewImage[]>([])
  const [validationError, setValidationError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ✅ Limpiar URLs de preview de forma optimizada
useEffect(() => {
  return () => {
    previews.forEach(p => {
      try {
        URL.revokeObjectURL(p.preview)
      } catch (error) {
        console.warn('Error revocando URL:', error)
      }
    })
  }
}, [previews])

// ✅ Optimización de memoria: limpiar previews cuando hay muchos
useEffect(() => {
  if (previews.length > 5) {
    console.warn('Muchos archivos en preview, considera la performance')
  }
}, [previews.length])

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
  const files = Array.from(e.target.files || [])
  setValidationError(null)

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

  // ✅ Crear previews de forma optimizada
const newPreviews: PreviewImage[] = files.map(file => {
  // Validar tamaño antes de crear preview para archivos muy grandes
  if (file.size > 10 * 1024 * 1024) { // 10MB
    console.warn('Archivo muy grande para preview:', file.name)
  }
  
  return {
    file,
    preview: URL.createObjectURL(file)
  }
})

  const updatedPreviews = [...previews, ...newPreviews]
  setPreviews(updatedPreviews)
  
  // Notificar al padre
  const allFiles = updatedPreviews.map(p => p.file)
  onFilesSelected(allFiles)
}

  const handleRemovePreview = (index: number) => {
  const updated = [...previews]
  URL.revokeObjectURL(updated[index].preview)
  updated.splice(index, 1)
  
  setPreviews(updated)
  setValidationError(null)
  
  // Notificar al padre
  const allFiles = updated.map(p => p.file)
  onFilesSelected(allFiles)
}

  const handleClickInput = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (disabled) return

    const files = Array.from(e.dataTransfer.files)
    setValidationError(null)

    // Filtrar solo imágenes
    const imageFiles = files.filter(file => file.type.startsWith('image/'))

    if (imageFiles.length === 0) {
      setValidationError('Por favor selecciona archivos de imagen')
      return
    }

    // Validar cantidad total
    if (previews.length + imageFiles.length > settings.max_images_per_post) {
      setValidationError(`Máximo ${settings.max_images_per_post} imágenes por post`)
      return
    }

    // Validar cada archivo
    for (const file of imageFiles) {
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

    // ✅ Crear previews de forma optimizada
const newPreviews: PreviewImage[] = imageFiles.map(file => {
  // Validar tamaño antes de crear preview para archivos muy grandes
  if (file.size > 10 * 1024 * 1024) { // 10MB
    console.warn('Archivo muy grande para preview:', file.name)
  }
  
  return {
    file,
    preview: URL.createObjectURL(file)
  }
})

  const updatedPreviews = [...previews, ...newPreviews]
  setPreviews(updatedPreviews)
  
  // Notificar al padre
  const allFiles = updatedPreviews.map(p => p.file)
  onFilesSelected(allFiles)
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
        disabled={disabled}
        className="hidden"
      />

      {/* Área de selección con drag & drop */}
      <div>
        <button
          type="button"
          onClick={handleClickInput}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          disabled={disabled || previews.length >= settings.max_images_per_post}
          className="w-full border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="text-gray-600">
            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="mt-2 text-sm font-medium">
              {previews.length >= settings.max_images_per_post 
                ? `Máximo ${settings.max_images_per_post} imágenes alcanzado`
                : '📷 Haz clic para seleccionar imágenes'
              }
            </p>
            <p className="text-xs text-gray-500 mt-1">
              o arrastra y suelta aquí
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Máximo {settings.max_image_size_mb}MB por imagen • {settings.max_images_per_post} imágenes máximo
            </p>
            <p className="text-xs text-gray-500">
              Formatos: JPEG, PNG, WEBP
            </p>
          </div>
        </button>
      </div>

      {/* Errores */}
      {validationError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {validationError}
        </div>
      )}

      {/* Previews */}
      {previews.length > 0 && (
        <div className="space-y-3">
          {/* Grid de previews */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {previews.map((preview, index) => (
              <div key={index} className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview.preview}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-40 object-cover rounded-lg border-2 border-gray-200"
                />
                
                {/* Botón eliminar */}
                <button
                  type="button"
                  onClick={() => handleRemovePreview(index)}
                  disabled={disabled}
                  className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transition-opacity disabled:opacity-50"
                  title="Eliminar imagen"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                
                {/* Info de archivo */}
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                  {preview.file.name.length > 20 
                    ? preview.file.name.substring(0, 17) + '...' 
                    : preview.file.name
                  }
                </div>
                
                {/* Tamaño */}
                <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                  {formatFileSize(preview.file.size)}
                </div>
              </div>
            ))}
          </div>

          {/* Contador */}
          <div className="flex items-center gap-2 text-sm text-gray-700 bg-blue-50 border border-blue-200 px-4 py-2 rounded-lg">
            <span className="text-lg">📎</span>
            <span className="font-medium">
              {previews.length} {previews.length === 1 ? 'imagen seleccionada' : 'imágenes seleccionadas'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}