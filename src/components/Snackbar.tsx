'use client';

import { useEffect, useState } from 'react';

interface SnackBarProps {
  message: string;
  isVisible: boolean;
  onHide: () => void;
  duration?: number;
}

export default function SnackBar({ message, isVisible, onHide, duration = 3000 }: SnackBarProps) {
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      const timer = setTimeout(() => {
        onHide();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 300); // Esperar a que termine la animación

      return () => clearTimeout(timer);
    }
  }, [isVisible, onHide, duration]);

  if (!shouldRender) return null;

  return (
    <div
      className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
    >
      <div className="bg-gray-800 text-white px-6 py-3 rounded-lg shadow-lg max-w-sm">
        <p className="text-sm font-medium">{message}</p>
      </div>
    </div>
  );
}