'use client';
import { useState, useEffect } from 'react';

export default function Suscripcion() {
  const [isAutoRenewal, setIsAutoRenewal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subscriptionPrice, setSubscriptionPrice] = useState(10.00);

  useEffect(() => {
  // Simplemente usar una variable de entorno del cliente o asumir configuración
  // Por ahora, detectamos desde una API simple
  const detectMode = async () => {
    try {
      // Obtener configuración de auto-renewal
      const configResponse = await fetch('/api/paypal/config');
      if (configResponse.ok) {
        const config = await configResponse.json();
        setIsAutoRenewal(config.autoRenewal);
      } else {
        setIsAutoRenewal(false);
      }

      // Obtener precio dinámico
      const priceResponse = await fetch('/api/subscription-price');
      if (priceResponse.ok) {
        const priceData = await priceResponse.json();
        setSubscriptionPrice(priceData.price);
      }
    } catch {
      setIsAutoRenewal(false);
      setSubscriptionPrice(10.00); // Fallback
    } finally {
      setLoading(false);
    }
  };

  detectMode();
}, []);

  const handleSuscripcion = async () => {
    try {
      const response = await fetch('/api/paypal/create-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success && data.approval_url) {
        window.location.href = data.approval_url;
      } else {
        alert('Error al crear el pago. Por favor intenta de nuevo.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error inesperado. Por favor intenta de nuevo.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Título dinámico */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            {isAutoRenewal ? (
              <>¡Únete a <span className="text-blue-600">Premium</span>!</>
            ) : (
              <>¡Hazte <span className="text-blue-600">Premium</span> Hoy!</>
            )}
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Accede a contenido exclusivo, funciones avanzadas y participa en discusiones especializadas con otros profesionales de la estética.
          </p>
        </div>

        {/* Tarjeta de suscripción */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 max-w-2xl mx-auto">
          {/* Precio y modalidad */}
          <div className="text-center mb-8">
            <div className="inline-flex items-baseline gap-2 mb-2">
              <span className="text-5xl font-bold text-gray-900">${subscriptionPrice}</span>
              <span className="text-xl text-gray-500">
                {isAutoRenewal ? '/ mes' : ''}
              </span>
            </div>
            
            {isAutoRenewal ? (
              <div>
                <p className="text-gray-600 mb-2">Suscripción mensual automática</p>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-green-800 text-sm font-medium">
                    ✅ Renovación automática • Cancela cuando quieras
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-gray-600 mb-2">Pago único - Acceso por 1 mes</p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-blue-800 text-sm font-medium">
                    💡 Sin renovación automática • Sin compromisos
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Lista de beneficios */}
          <div className="mb-8">
            <h3 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
              {isAutoRenewal ? 
                'Tu suscripción Premium incluye:' : 
                'Tu acceso Premium incluye:'
              }
            </h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-gray-900 font-medium">Interacciones ilimitadas</p>
                  <p className="text-gray-600 text-sm">Da like y comenta en todos los posts sin restricciones</p>
                </div>
              </li>
              
              <li className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-gray-900 font-medium">Contenido exclusivo premium</p>
                  <p className="text-gray-600 text-sm">Acceso a artículos, tutoriales y recursos solo para miembros</p>
                </div>
              </li>
              
              <li className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-gray-900 font-medium">Comunidad VIP</p>
                  <p className="text-gray-600 text-sm">Participa en discusiones especializadas con profesionales certificados</p>
                </div>
              </li>
              
              <li className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-gray-900 font-medium">Soporte prioritario</p>
                  <p className="text-gray-600 text-sm">Respuesta rápida a tus consultas y dudas técnicas</p>
                </div>
              </li>
              
              <li className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-gray-900 font-medium">Funciones avanzadas</p>
                  <p className="text-gray-600 text-sm">Herramientas premium para potenciar tu práctica profesional</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Botón dinámico */}
          <button 
            onClick={handleSuscripcion}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-4 px-8 rounded-xl text-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            {isAutoRenewal ? '🚀 Iniciar Suscripción' : '💎 Obtener Acceso Premium'}
          </button>
          
          <div className="text-center mt-4">
            <p className="text-sm text-gray-500">
              {isAutoRenewal ? 
                '📱 Administra tu suscripción desde tu perfil' : 
                '✨ Acceso inmediato por 30 días'
              }
            </p>
          </div>
        </div>

        {/* Garantía dinámica */}
        <div className="text-center mt-8">
          <p className="text-gray-600">
            {isAutoRenewal ? 
              '🔒 Cancela en cualquier momento sin penalizaciones' : 
              '💰 Garantía de satisfacción - Soporte completo incluido'
            }
          </p>
        </div>
      </div>
    </main>
  );
}