// src/hooks/useAvatarCropper.ts

import { useState, useRef, useCallback, useEffect } from 'react'

interface CropState {
  offsetX: number
  offsetY: number
  scale: number
}

interface UseAvatarCropperReturn {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  cropState: CropState
  isDragging: boolean
  handleMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void
  handleMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void
  handleMouseUp: () => void
  handleMouseLeave: () => void
  handleWheel: (e: React.WheelEvent<HTMLCanvasElement>) => void
  handleTouchStart: (e: React.TouchEvent<HTMLCanvasElement>) => void
  handleTouchMove: (e: React.TouchEvent<HTMLCanvasElement>) => void
  handleTouchEnd: () => void
  loadImage: (src: string) => void
  getCroppedBlob: () => Promise<Blob | null>
  resetCrop: () => void
}

const CANVAS_SIZE = 400
const MIN_SCALE = 0.5
const MAX_SCALE = 3

export function useAvatarCropper(): UseAvatarCropperReturn {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const dragStartRef = useRef<{ x: number; y: number } | null>(null)
  const pinchStartRef = useRef<{ distance: number; scale: number } | null>(null)

  const [cropState, setCropState] = useState<CropState>({
    offsetX: 0,
    offsetY: 0,
    scale: 1,
  })
  const [isDragging, setIsDragging] = useState(false)

  const drawCanvas = useCallback((state: CropState) => {
    const canvas = canvasRef.current
    const img = imageRef.current
    if (!canvas || !img) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

    // Fondo oscuro
    ctx.fillStyle = '#1a1a1a'
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

    // Dibujar imagen
    const scaledW = img.naturalWidth * state.scale
    const scaledH = img.naturalHeight * state.scale
    const x = CANVAS_SIZE / 2 + state.offsetX - scaledW / 2
    const y = CANVAS_SIZE / 2 + state.offsetY - scaledH / 2

    ctx.drawImage(img, x, y, scaledW, scaledH)

    // Overlay oscuro fuera del círculo
    ctx.save()
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)'
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath()
    ctx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 16, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()

    // Borde del círculo
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 16, 0, Math.PI * 2)
    ctx.stroke()
  }, [])

  useEffect(() => {
    drawCanvas(cropState)
  }, [cropState, drawCanvas])

  const loadImage = useCallback((src: string) => {
    const img = new Image()
    img.onload = () => {
      imageRef.current = img

      // Calcular escala inicial para que la imagen llene el círculo
      const circleSize = CANVAS_SIZE - 32
      const scaleToFill = Math.max(
        circleSize / img.naturalWidth,
        circleSize / img.naturalHeight
      )

      const initialState = { offsetX: 0, offsetY: 0, scale: scaleToFill }
      setCropState(initialState)
      drawCanvas(initialState)
    }
    img.src = src
  }, [drawCanvas])

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect()
    dragStartRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    }
    setIsDragging(true)
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragStartRef.current) return
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect()
    const currentX = e.clientX - rect.left
    const currentY = e.clientY - rect.top
    const dx = currentX - dragStartRef.current.x
    const dy = currentY - dragStartRef.current.y
    dragStartRef.current = { x: currentX, y: currentY }

    setCropState(prev => {
      const next = { ...prev, offsetX: prev.offsetX + dx, offsetY: prev.offsetY + dy }
      return next
    })
  }, [])

  const handleMouseUp = useCallback(() => {
    dragStartRef.current = null
    setIsDragging(false)
  }, [])

  const handleMouseLeave = useCallback(() => {
    dragStartRef.current = null
    setIsDragging(false)
  }, [])

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.05 : 0.05
    setCropState(prev => ({
      ...prev,
      scale: Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.scale + delta)),
    }))
  }, [])

  const getDistance = (t1: React.Touch, t2: React.Touch) => {
    const dx = t1.clientX - t2.clientX
    const dy = t1.clientY - t2.clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      const rect = (e.target as HTMLCanvasElement).getBoundingClientRect()
      dragStartRef.current = {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      }
    } else if (e.touches.length === 2) {
      pinchStartRef.current = {
        distance: getDistance(e.touches[0], e.touches[1]),
        scale: cropState.scale,
      }
      dragStartRef.current = null
    }
  }, [cropState.scale])

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    if (e.touches.length === 1 && dragStartRef.current) {
      const rect = (e.target as HTMLCanvasElement).getBoundingClientRect()
      const currentX = e.touches[0].clientX - rect.left
      const currentY = e.touches[0].clientY - rect.top
      const dx = currentX - dragStartRef.current.x
      const dy = currentY - dragStartRef.current.y
      dragStartRef.current = { x: currentX, y: currentY }
      setCropState(prev => ({ ...prev, offsetX: prev.offsetX + dx, offsetY: prev.offsetY + dy }))
    } else if (e.touches.length === 2 && pinchStartRef.current) {
      const currentDistance = getDistance(e.touches[0], e.touches[1])
      const ratio = currentDistance / pinchStartRef.current.distance
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, pinchStartRef.current.scale * ratio))
      setCropState(prev => ({ ...prev, scale: newScale }))
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    dragStartRef.current = null
    pinchStartRef.current = null
  }, [])

  const getCroppedBlob = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const img = imageRef.current
      if (!img) return resolve(null)

      const outputCanvas = document.createElement('canvas')
      const outputSize = 400
      outputCanvas.width = outputSize
      outputCanvas.height = outputSize
      const ctx = outputCanvas.getContext('2d')
      if (!ctx) return resolve(null)

      // Aplicar clip circular
      ctx.beginPath()
      ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2)
      ctx.clip()

      const scaledW = img.naturalWidth * cropState.scale
      const scaledH = img.naturalHeight * cropState.scale
      const x = outputSize / 2 + cropState.offsetX - scaledW / 2
      const y = outputSize / 2 + cropState.offsetY - scaledH / 2

      ctx.drawImage(img, x, y, scaledW, scaledH)

      outputCanvas.toBlob((blob) => resolve(blob), 'image/webp', 0.92)
    })
  }, [cropState])

  const resetCrop = useCallback(() => {
    imageRef.current = null
    setCropState({ offsetX: 0, offsetY: 0, scale: 1 })
  }, [])

  return {
    canvasRef,
    cropState,
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
  }
}