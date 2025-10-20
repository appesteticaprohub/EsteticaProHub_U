'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import SpecialtySelect from '@/components/SpecialtySelect';
import CountrySelect from '@/components/CountrySelect';
import DateSelect from '@/components/DateSelect';

function RegistroContent() {
  const [formData, setFormData] = useState({
  nombre: '',
  apellido: '',
  email: '',
  contraseña: '',
  especialidad: '',
  pais: '',
  fechaNacimiento: {
    day: '',
    month: '',
    year: ''
  }
});
  
  const [loading, setLoading] = useState(false);
  const [paymentValidated, setPaymentValidated] = useState<boolean | null>(null);
  const [, setPaymentError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const paymentRef = searchParams.get('ref');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const router = useRouter();
  const [isRenewal, setIsRenewal] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState(false);
  const [, setRenewalProcessed] = useState<boolean>(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Capitalizar primera letra para nombre y apellido
    let processedValue = value;
    if (name === 'nombre' || name === 'apellido') {
      processedValue = value
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
  const { name, value } = e.target;
  setFormData(prev => ({
    ...prev,
    [name]: value
  }));
};

const handleDateChange = (field: 'day' | 'month' | 'year', value: string) => {
  setFormData(prev => ({
    ...prev,
    fechaNacimiento: {
      ...prev.fechaNacimiento,
      [field]: value
    }
  }));
};

  const { signUp } = useAuth();

  // Función para procesar renovación de usuario existente
  const processRenewal = useCallback(async (paymentRef: string) => {
    try {
      console.log('🔄 Procesando renovación para usuario existente');
      console.log('🔄 Payment ref:', paymentRef);
      
      // Calcular nueva fecha de expiración (30 días desde hoy)
      const now = new Date();
      const newExpirationDate = new Date(now.setMonth(now.getMonth() + 1));
      
      // Actualizar el perfil del usuario existente
      const response = await fetch('/api/auth/renew-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          external_reference: paymentRef,
          subscription_expires_at: newExpirationDate.toISOString()
        }),
      });

      if (response.ok) {
        console.log('✅ Renovación procesada exitosamente');
        
        // Marcar payment session como usada
        await fetch('/api/paypal/mark-session-used', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ external_reference: paymentRef }),
        });

        setRenewalProcessed(true);
        setMessage({
          type: 'success',
          text: '¡Renovación exitosa! Tu suscripción Premium ha sido extendida.'
        });

        // Redirigir al perfil después de 3 segundos
        setTimeout(() => {
          router.push('/perfil');
        }, 3000);

      } else {
        console.error('❌ Error procesando renovación');
        setPaymentError('Error al procesar la renovación');
      }
    } catch (error) {
      console.error('❌ Error inesperado en renovación:', error);
      setPaymentError('Error inesperado al procesar la renovación');
    }
  }, [router, setPaymentError, setRenewalProcessed, setMessage]);

  // Validar payment session al cargar la página
useEffect(() => {
  const validatePayment = async () => {
    if (!paymentRef) {
      setPaymentError('No se encontró referencia de pago válida');
      return;
    }

    console.log('🔍 Validando pago/suscripción para ref:', paymentRef);
    console.log('🔍 Parámetros URL:', Object.fromEntries(searchParams.entries()));

    // Verificar si es un pago único (parámetros tradicionales de PayPal)
    const paymentId = searchParams.get('paymentId');
    const payerId = searchParams.get('PayerID');

    // Verificar si es una suscripción (parámetros de PayPal subscription)
    const subscriptionId = searchParams.get('subscription_id');
    const baToken = searchParams.get('ba_token');

    console.log('💳 Tipo de pago detectado:', {
      paymentId,
      payerId,
      subscriptionId,
      baToken,
      isOneTimePayment: !!(paymentId && payerId),
      isSubscription: !!(subscriptionId || baToken)
    });

    // FLUJO PARA PAGOS ÚNICOS
    if (paymentId && payerId) {
      console.log('💰 Procesando pago único...');
      try {
        const executeResponse = await fetch('/api/paypal/execute-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            paymentId: paymentId,
            payerId: payerId,
            externalReference: paymentRef
          }),
        });

        console.log('💰 Respuesta execute-payment:', executeResponse.status);

        if (!executeResponse.ok) {
          setPaymentError('Error al confirmar el pago');
          return;
        }
      } catch (error) {
        console.error('❌ Error ejecutando pago:', error);
        setPaymentError('Error al confirmar el pago');
        return;
      }
    }

    // FLUJO PARA SUSCRIPCIONES
    else if (subscriptionId || baToken) {
      console.log('🔄 Procesando suscripción aprobada...');
      try {
        // Ejecutar aprobación de suscripción
        const executeResponse = await fetch('/api/paypal/execute-payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            subscriptionId: subscriptionId,
            baToken: baToken,
            externalReference: paymentRef,
            type: 'subscription'
          }),
        });

        console.log('🔄 Respuesta execute-subscription:', executeResponse.status);

        if (!executeResponse.ok) {
          const errorData = await executeResponse.json();
          console.error('❌ Error en execute-subscription:', errorData);
          setPaymentError('Error al confirmar la suscripción');
          return;
        }

        const responseData = await executeResponse.json();
        console.log('✅ Suscripción procesada:', responseData);
      } catch (error) {
        console.error('❌ Error ejecutando suscripción:', error);
        setPaymentError('Error al confirmar la suscripción');
        return;
      }
    }

    // Validar payment session (común para ambos flujos)
    console.log('🔍 Validando sesión de pago...');
    try {
      const response = await fetch(`/api/paypal/validate-session?ref=${paymentRef}`);
      const data = await response.json();

      console.log('🔍 Respuesta validate-session:', data);

      if (data.isValid) {
        console.log('✅ Pago/suscripción validada correctamente');
        setPaymentValidated(true);
        
        // NUEVA LÓGICA: Verificar si es renovación de usuario existente
        // Usar una verificación más robusta del estado de autenticación
        const checkUserAndProcessRenewal = async () => {
          try {
            const response = await fetch('/api/auth/session');
            const sessionData = await response.json();
            
            console.log('🔍 Verificando sesión de usuario:', sessionData);
            
            if (sessionData.data && sessionData.data.user) {
              console.log('🔄 Usuario autenticado detectado - procesando renovación');
              console.log('🔄 Usuario:', sessionData.data.user.email);
              setIsRenewal(true);
              await processRenewal(paymentRef);
            } else {
              console.log('👤 Usuario no autenticado - flujo de registro normal');
            }
          } catch (error) {
            console.error('❌ Error verificando sesión:', error);
            console.log('👤 Asumiendo usuario no autenticado - flujo de registro normal');
          }
        };
        
        await checkUserAndProcessRenewal();
      } else {
        console.error('❌ Sesión inválida:', data.error);
        setPaymentError(data.error || 'Sesión de pago inválida');
      }
    } catch (error) {
      console.error('❌ Error validando sesión:', error);
      setPaymentError('Error al validar el pago');
    }
  };

  validatePayment();
}, [paymentRef, searchParams, processRenewal]);

const handleSubmit = async (e: React.FormEvent) =>  {
  e.preventDefault();
  
  if (!paymentValidated) {
    setMessage({
      type: 'error',
      text: 'Debe completar el pago antes de registrarse'
    });
    return;
  }

  setLoading(true);
  setMessage(null);

  try {
    const fullName = `${formData.nombre} ${formData.apellido}`;
    const birthDate = `${formData.fechaNacimiento.year}-${formData.fechaNacimiento.month.padStart(2, '0')}-${formData.fechaNacimiento.day.padStart(2, '0')}`;
    
    const { error } = await signUp(
      formData.email, 
      formData.contraseña, 
      fullName,
      formData.especialidad,
      formData.pais,
      birthDate,
      paymentRef || undefined // Convertir null a undefined
    );

    if (error) {
      setMessage({
        type: 'error',
        text: `Error: ${error.message}`
      });
    } else {
      // Marcar payment session como usada
      if (paymentRef) {
        await fetch('/api/paypal/mark-session-used', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ external_reference: paymentRef }),
        });
      }

      setMessage({
        type: 'success',
        text: '¡Registro exitoso! Tu suscripción Premium está activa.'
      });
      
      // Redirigir al perfil después de 2 segundos
      setTimeout(() => {
        router.push('/perfil');
      }, 2000);
    }
  } catch {
    setMessage({
      type: 'error',
      text: 'Error inesperado. Por favor intenta de nuevo.'
    });
  } finally {
    setLoading(false);
  }
};

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-100 py-12 px-4">
      <div className="max-w-md mx-auto">
        {/* Título */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isRenewal ? '¡Renovación Exitosa!' : '¡Completa tu registro!'}
          </h1>
          <p className="text-gray-600">
            {isRenewal 
              ? 'Tu suscripción Premium ha sido renovada exitosamente'
              : 'Solo faltan unos datos para activar tu cuenta Premium'
            }
          </p>
        </div>

        {/* Formulario solo para usuarios nuevos */}
        {!isRenewal && (
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Mensaje de éxito/error */}
          {message && (
            <div className={`mb-6 p-4 rounded-lg ${
              message.type === 'success' 
                ? 'bg-green-100 border border-green-400 text-green-700' 
                : 'bg-red-100 border border-red-400 text-red-700'
            }`}>
              <p className="text-sm font-medium">{message.text}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Campo Nombre */}
            <div>
              <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-2">
                Nombre *
              </label>
              <input
                type="text"
                id="nombre"
                name="nombre"
                value={formData.nombre}
                onChange={handleInputChange}
                required
                disabled={loading}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50"
                placeholder="Tu nombre"
              />
            </div>

            {/* Campo Apellido */}
            <div>
              <label htmlFor="apellido" className="block text-sm font-medium text-gray-700 mb-2">
                Apellido *
              </label>
              <input
                type="text"
                id="apellido"
                name="apellido"
                value={formData.apellido}
                onChange={handleInputChange}
                required
                disabled={loading}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50"
                placeholder="Tu apellido"
              />
            </div>

            {/* Campo Especialidad */}
            <div>
              <label htmlFor="especialidad" className="block text-sm font-medium text-gray-700 mb-2">
                Especialidad *
              </label>
              <SpecialtySelect
                id="especialidad"
                name="especialidad"
                value={formData.especialidad}
                onChange={handleSelectChange}
                required
                disabled={loading}
              />
            </div>

            {/* Campo País */}
            <div>
              <label htmlFor="pais" className="block text-sm font-medium text-gray-700 mb-2">
                País *
              </label>
              <CountrySelect
                id="pais"
                name="pais"
                value={formData.pais}
                onChange={handleSelectChange}
                required
                disabled={loading}
              />
            </div>

            {/* Campo Fecha de Nacimiento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fecha de Nacimiento *
              </label>
              <DateSelect
                day={formData.fechaNacimiento.day}
                month={formData.fechaNacimiento.month}
                year={formData.fechaNacimiento.year}
                onChange={handleDateChange}
                required
                disabled={loading}
              />
            </div>

            {/* Campo Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
                disabled={loading}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50"
                placeholder="tu@email.com"
              />
            </div>

            {/* Campo Contraseña */}
            <div>
              <label htmlFor="contraseña" className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="contraseña"
                  name="contraseña"
                  value={formData.contraseña}
                  onChange={handleInputChange}
                  required
                  disabled={loading}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50"
                  placeholder="Mínimo 8 caracteres"
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  disabled={loading}
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Botón de envío */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 px-8 rounded-lg text-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:transform-none disabled:shadow-none"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Registrando...
                </div>
              ) : (
                '✨ Finalizar Registro'
              )}
            </button>
          </form>

          {/* Información adicional */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Al registrarte, aceptas nuestros términos y condiciones
            </p>
          </div>
        </div>
        )}

        {/* Mensaje para renovaciones */}
        {isRenewal && (
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Listo!</h2>
              <p className="text-gray-600 mb-4">
                Tu suscripción Premium ha sido renovada por 30 días adicionales.
              </p>
              {message && message.type === 'success' && (
                <div className="bg-green-100 border border-green-400 text-green-700 p-4 rounded-lg mb-4">
                  <p className="text-sm font-medium">{message.text}</p>
                </div>
              )}
              <p className="text-sm text-gray-500">
                Serás redirigido a tu perfil en unos segundos...
              </p>
            </div>
          </div>
        )}

        {/* Indicador de éxito */}
        <div className="text-center mt-6">
          <p className="text-green-600 font-medium">
            🎉 ¡Ya casi terminas! Tu suscripción Premium está lista.
          </p>
        </div>
      </div>
    </main>
  );
}

export default function Registro() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RegistroContent />
    </Suspense>
  )
}