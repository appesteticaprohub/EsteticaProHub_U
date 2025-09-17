'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import SpecialtySelect from '@/components/SpecialtySelect';
import CountrySelect from '@/components/CountrySelect';
import DateSelect from '@/components/DateSelect';

export default function Registro() {
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
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const paymentRef = searchParams.get('ref');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
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

  // Validar payment session al cargar la página
useEffect(() => {
  const validatePayment = async () => {
    if (!paymentRef) {
      setPaymentError('No se encontró referencia de pago válida');
      return;
    }

    // Si hay parámetros de PayPal, ejecutar el pago primero
    const paymentId = searchParams.get('paymentId');
    const payerId = searchParams.get('PayerID');

    console.log('Payment params:', { paymentId, payerId, paymentRef });

    if (paymentId && payerId) {
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

        console.log('Sending to execute-payment:', { paymentId, payerId, externalReference: paymentRef });

        if (!executeResponse.ok) {
          setPaymentError('Error al confirmar el pago');
          return;
        }
      } catch (error) {
        setPaymentError('Error al confirmar el pago');
        return;
      }
    }

    // Validar payment session
    try {
      const response = await fetch(`/api/paypal/validate-session?ref=${paymentRef}`);
      const data = await response.json();

      if (data.isValid) {
        setPaymentValidated(true);
      } else {
        setPaymentError(data.error || 'Sesión de pago inválida');
      }
    } catch (error) {
      setPaymentError('Error al validar el pago');
    }
  };

  validatePayment();
}, [paymentRef, searchParams]);

const handleSubmit = async (e: React.FormEvent) => {
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
      birthDate
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
      
      // Limpiar el formulario
      setFormData({
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
    }
  } catch (error) {
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
            ¡Completa tu registro!
          </h1>
          <p className="text-gray-600">
            Solo faltan unos datos para activar tu cuenta Premium
          </p>
        </div>

        {/* Formulario */}
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
              <input
                type="password"
                id="contraseña"
                name="contraseña"
                value={formData.contraseña}
                onChange={handleInputChange}
                required
                disabled={loading}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 disabled:opacity-50"
                placeholder="Mínimo 8 caracteres"
                minLength={8}
              />
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