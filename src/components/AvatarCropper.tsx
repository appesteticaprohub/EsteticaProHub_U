// src/components/AvatarCropper.tsx

'use client'

import { useEffect } from 'react'
import { useAvatarCropper } from '@/hooks/useAvatarCropper'

interface AvatarCropperProps {
  imageSrc: string
  onConfirm: (blob: Blob) => void
  onCancel: () => void
}

export default function AvatarCropper({ imageSrc, onConfirm, onCancel }: AvatarCropperProps) {
  const {
    canvasRef,
    isDragging,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    loadImage,
    getCroppedBlob,
    resetCrop,
  } = useAvatarCropper()

  useEffect(() => {
    loadImage(imageSrc)
    return () => resetCrop()
  }, [imageSrc, loadImage, resetCrop])

  const handleConfirm = async () => {
    const blob = await getCroppedBlob()
    if (blob) onConfirm(blob)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Ajustar foto de perfil
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Arrastra para mover · Rueda del mouse o pellizco para zoom
          </p>
        </div>

        {/* Canvas */}
        <div className="flex justify-center bg-gray-900 py-4">
          <canvas
            ref={canvasRef}
            width={400}
            height={400}
            className="max-w-full"
            style={{
              cursor: isDragging ? 'grabbing' : 'grab',
              touchAction: 'none',
              display: 'block',
              maxWidth: '100%',
              height: 'auto',
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex gap-3 justify-end border-t border-gray-200">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-md font-medium transition-colors"
          >
            Guardar
          </button>
        </div>

      </div>
    </div>
  )
}