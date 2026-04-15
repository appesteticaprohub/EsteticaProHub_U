// src/components/PaymentPendingScreen.tsx
'use client';

import { usePaymentPending } from '@/hooks/usePaymentPending';

interface PaymentPendingScreenProps {
  paymentRef: string;
  payerEmail: string | null;
  onConfirmed: (isExistingUser: boolean) => void;
  onRejected: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function PaymentPendingScreen({
  paymentRef,
  payerEmail,
  onConfirmed,
  onRejected,
}: PaymentPendingScreenProps) {
  const { status, secondsElapsed, checkNow } = usePaymentPending(
    paymentRef,
    onConfirmed,
    onRejected,
  );

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-100 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">

          {/* Ícono animado */}
          <div className="w-20 h-20 mx-auto mb-6 relative">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center">
              <svg className="w-10 h-10 text-purple-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="absolute inset-0 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin"></div>
          </div>

          {/* Título */}
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Procesando tu pago PSE
          </h1>

          {/* Descripción */}
          <p className="text-gray-600 mb-2 leading-relaxed">
            Tu banco está verificando la transacción. Este proceso puede tomar entre unos minutos y unas horas.
          </p>

          {/* Email */}
          {payerEmail && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-6">
              <p className="text-purple-800 text-sm">
                📧 Te notificaremos a <strong>{payerEmail}</strong> cuando tu acceso esté listo.
              </p>
            </div>
          )}

          {!payerEmail && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-6">
              <p className="text-purple-800 text-sm">
                📧 Te enviaremos un correo cuando tu acceso esté listo.
              </p>
            </div>
          )}

          {/* Separador */}
          <div className="border-t border-gray-100 my-6"></div>

          {/* Estado del polling */}
          <div className="mb-6">
            <p className="text-xs text-gray-400 mb-3">
              Verificando automáticamente cada 30 segundos
              {secondsElapsed > 0 && ` · ${formatTime(secondsElapsed)} esperando`}
            </p>

            {/* Barra de progreso animada */}
            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
          </div>

          {/* Botón verificar ahora */}
          <button
            onClick={checkNow}
            disabled={status !== 'waiting'}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 mb-4 disabled:cursor-not-allowed"
          >
            🔄 Verificar ahora
          </button>

          {/* Mensaje tranquilizador */}
          <p className="text-xs text-gray-400 leading-relaxed">
            Puedes cerrar esta ventana con tranquilidad. Recibirás el correo de confirmación cuando el banco apruebe el pago.
          </p>

        </div>

        {/* Info adicional */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            ¿Tienes dudas? Escríbenos a{' '}
            <a
              href="mailto:soporte@esteticaprohub.com"
              className="text-purple-600 underline hover:text-purple-800"
            >
              soporte@esteticaprohub.com
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}