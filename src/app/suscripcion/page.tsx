'use client';

import { useRouter } from 'next/navigation';

export default function Suscripcion() {
  const router = useRouter();

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
      // Redirigir a PayPal
      window.location.href = data.approval_url;
    } else {
      alert('Error al crear el pago. Por favor intenta de nuevo.');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error inesperado. Por favor intenta de nuevo.');
  }
};

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Título llamativo */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            ¡Hazte <span className="text-blue-600">Premium</span> Hoy!
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Accede a contenido exclusivo, funciones avanzadas y participa en discusiones especializadas con otros profesionales de la estética.
          </p>
        </div>

        {/* Tarjeta de suscripción */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 max-w-2xl mx-auto">
          {/* Precio destacado */}
          <div className="text-center mb-8">
            <div className="inline-flex items-baseline gap-2 mb-2">
              <span className="text-5xl font-bold text-gray-900">$10</span>
              <span className="text-xl text-gray-500">/ mes</span>
            </div>
            <p className="text-gray-600">Facturación mensual • Cancela cuando quieras</p>
          </div>

          {/* Lista de beneficios */}
          <div className="mb-8">
            <h3 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
              Lo que incluye tu suscripción Premium:
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

          {/* Botón llamativo */}
          <button 
            onClick={handleSuscripcion}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-4 px-8 rounded-xl text-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            🚀 Suscribirse Ahora
          </button>
          
          <div className="text-center mt-4">
            <p className="text-sm text-gray-500">
              ✨ Oferta especial: Primer mes con 30% de descuento
            </p>
          </div>
        </div>

        {/* Garantía */}
        <div className="text-center mt-8">
          <p className="text-gray-600">
            💰 Garantía de 30 días - Si no estás satisfecho, te devolvemos tu dinero
          </p>
        </div>
      </div>
    </main>
  );
}