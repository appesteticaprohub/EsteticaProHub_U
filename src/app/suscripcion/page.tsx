'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

declare global {
  interface Window {
    ePayco: {
      checkout: {
        configure: (config: Record<string, string>) => {
          open: (params: Record<string, string>) => void;
        };
      };
    };
  }
}

function SuscripcionContent() {
  const [loading, setLoading] = useState(true);
  const [subscriptionPrice, setSubscriptionPrice] = useState(10.00);
  const [isProcessing, setIsProcessing] = useState(false);
  const [externalReference, setExternalReference] = useState<string | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const { user, subscriptionStatus } = useAuth();

  useEffect(() => {
    const error = searchParams.get('payment_error');
    if (error) setPaymentError(decodeURIComponent(error));
  }, [searchParams]);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.epayco.co/checkout.js';
    script.async = true;
    script.onload = () => setSdkReady(true);
    document.body.appendChild(script);

    const init = async () => {
      try {
        const priceResponse = await fetch('/api/epayco/config');
        if (priceResponse.ok) {
          const data = await priceResponse.json();
          setSubscriptionPrice(data.price);
        }
      } catch {
        setSubscriptionPrice(10.00);
      } finally {
        setLoading(false);
      }
    };

    init();

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleSuscripcion = async () => {
    if (isProcessing || !sdkReady) return;

    setIsProcessing(true);

    try {
      // Determinar flow_type según estado del usuario
      let flowType = 'new_user';
      let userId: string | null = null;

      if (user) {
        userId = user.id;
        flowType = 'renewal';
      }

      const response = await fetch('/api/epayco/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          flow_type: flowType,
          user_id: userId,
        }),
      });

      const data = await response.json();

      if (!data.success || !data.checkout_params) {
        setIsProcessing(false);
        return;
      }

      setExternalReference(data.external_reference);

      const params = data.checkout_params;

      const handler = window.ePayco.checkout.configure({
        key: params.p_public_key,
        test: params.p_test_request === '1' ? 'true' : 'false',
      });

      handler.open({
        name: 'EsteticaProHub Premium',
        description: params.p_description,
        invoice: params.p_id_invoice,
        currency: params.p_currency_code,
        amount: params.p_amount,
        tax_base: params.p_tax_base,
        tax: params.p_tax,
        country: 'CO',
        lang: 'es',
        external: 'false',
        response: params.p_url_response,
        confirmation: params.p_url_confirmation,
        extra1: params.p_extra1,
      });

      setIsProcessing(false);

    } catch (error) {
      setIsProcessing(false);
      console.error('Error:', error);
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
        {paymentError && (
          <div className="max-w-2xl mx-auto mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg text-center">
            <p className="font-semibold">⚠️ {paymentError}</p>
            <p className="text-sm mt-1">Por favor intenta de nuevo.</p>
          </div>
        )}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            ¡Hazte <span className="text-blue-600">Premium</span> Hoy!
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Accede a contenido exclusivo, funciones avanzadas y participa en discusiones especializadas con otros profesionales de la estética.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-baseline gap-2 mb-2">
              <span className="text-5xl font-bold text-gray-900">${subscriptionPrice}</span>
            </div>
            <div>
              <p className="text-gray-600 mb-2">Pago único - Acceso por 1 mes</p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-blue-800 text-sm font-medium">
                  💡 Sin renovación automática • Sin compromisos
                </p>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
              Tu acceso Premium incluye:
            </h3>
            <ul className="space-y-4">
              {[
                { title: 'Interacciones ilimitadas', desc: 'Da like y comenta en todos los posts sin restricciones' },
                { title: 'Contenido exclusivo premium', desc: 'Acceso a publicaciones, tutoriales y recursos solo para miembros' },
                { title: 'Comunidad VIP', desc: 'Participa en discusiones especializadas con profesionales certificados' },
                { title: 'Soporte prioritario', desc: 'Respuesta rápida a tus consultas y dudas técnicas' },
                { title: 'Funciones avanzadas', desc: 'Herramientas premium para potenciar tu práctica profesional' },
              ].map((item) => (
                <li key={item.title} className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-gray-900 font-medium">{item.title}</p>
                    <p className="text-gray-600 text-sm">{item.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <button
            onClick={handleSuscripcion}
            disabled={isProcessing || !sdkReady}
            className={`w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-4 px-8 rounded-xl text-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-3 ${
              isProcessing || !sdkReady ? 'opacity-75 cursor-not-allowed transform-none' : ''
            }`}
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Procesando...</span>
              </>
            ) : (
              <span>💎 Obtener Acceso Premium</span>
            )}
          </button>

          <div className="text-center mt-4">
            <p className="text-sm text-gray-500">✨ Acceso inmediato por 30 días</p>
          </div>
        </div>

        <div className="text-center mt-8">
          <p className="text-gray-600">💰 Garantía de satisfacción - Soporte completo incluido</p>
        </div>
      </div>
    </main>
  );
}

export default function Suscripcion() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    }>
      <SuscripcionContent />
    </Suspense>
  );
}