'use client'

import { useState } from 'react'
import Image from 'next/image'

interface AvatarProps {
  src: string | null
  alt: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  fallbackText: string
  className?: string
}

const sizeClasses = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-16 h-16 text-xl',
  xl: 'w-24 h-24 text-2xl'
}

const sizePx = {
  sm: 32,
  md: 40,
  lg: 64,
  xl: 96
}

export default function Avatar({ 
  src, 
  alt, 
  size = 'md', 
  fallbackText,
  className = ''
}: AvatarProps) {
  const [imageError, setImageError] = useState(false)

  const showFallback = !src || imageError

  return (
    <div 
      className={`${sizeClasses[size]} rounded-full overflow-hidden flex-shrink-0 ${className}`}
    >
      {showFallback ? (
        <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
          {fallbackText}
        </div>
      ) : (
        <Image
          src={src}
          alt={alt}
          width={sizePx[size]}
          height={sizePx[size]}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      )}
    </div>
  )
}