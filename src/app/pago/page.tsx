'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Pago() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    // Simular procesamiento de pago por 3 segundos
    const timer = setTimeout(() => {
      setIsProcessing(false);
      router.push('/registro');
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 flex items-center justify-center px-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          {/* Icono de procesamiento */}
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <svg 
                className="w-8 h-8 text-blue-600 animate-spin" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6" 
                />
              </svg>
            </div>
          </div>

          {/* Título */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Procesando pago...
          </h1>
          
          {/* Descripción */}
          <p className="text-gray-600 mb-6">
            Estamos procesando tu suscripción Premium. 
            <br />
            Por favor espera un momento.
          </p>

          {/* Barra de progreso */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-3000 ease-out animate-pulse"
              style={{ width: '75%' }}
            ></div>
          </div>

          {/* Texto adicional */}
          <p className="text-sm text-gray-500">
            🔒 Conexión segura • Powered by MercadoPago
          </p>
        </div>
      </div>
    </main>
  );
}