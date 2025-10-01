import { useState } from 'react'
import imageCompression from 'browser-image-compression'
import { ImageSettings } from '@/types/api'

interface UseImageUploadReturn {
  uploadImages: (files: File[]) => Promise<string[]>
  uploading: boolean
  progress: number
  error: string | null
  clearError: () => void
}

export function useImageUpload(settings: ImageSettings): UseImageUploadReturn {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const clearError = () => setError(null)

  const compressImage = async (file: File): Promise<File> => {
    const options = {
      maxSizeMB: settings.max_image_size_mb,
      maxWidthOrHeight: Math.max(settings.max_width, settings.max_height),
      useWebWorker: true,
      fileType: file.type,
      initialQuality: settings.compression_quality
    }

    try {
      const compressedFile = await imageCompression(file, options)
      return compressedFile
    } catch (err) {
      console.error('Error al comprimir imagen:', err)
      // Si falla la compresión, devolver el archivo original
      return file
    }
  }

  const uploadImages = async (files: File[]): Promise<string[]> => {
    setUploading(true)
    setProgress(0)
    setError(null)

    try {
      // Validar cantidad
      if (files.length > settings.max_images_per_post) {
        throw new Error(`Máximo ${settings.max_images_per_post} imágenes por post`)
      }

      // Comprimir imágenes
      const compressedFiles: File[] = []
      for (let i = 0; i < files.length; i++) {
        const compressed = await compressImage(files[i])
        compressedFiles.push(compressed)
        setProgress(((i + 1) / (files.length * 2)) * 100) // 50% para compresión
      }

      // Crear FormData
      const formData = new FormData()
      compressedFiles.forEach((file) => {
        formData.append('images', file)
      })

      // Subir a la API
      const response = await fetch('/api/posts/upload-images', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al subir imágenes')
      }

      const result = await response.json()
      setProgress(100)
      
      return result.urls

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      setError(errorMessage)
      throw err
    } finally {
      setUploading(false)
    }
  }

  return {
    uploadImages,
    uploading,
    progress,
    error,
    clearError
  }
}