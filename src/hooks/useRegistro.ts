// src/hooks/useRegistro.ts
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export type RegistroFlow = 'loading' | 'new_user' | 'existing_user' | 'renewal';

export interface RegistroFormData {
  nombre: string;
  apellido: string;
  email: string;
  contraseña: string;
  especialidad: string;
  pais: string;
  fechaNacimiento: {
    day: string;
    month: string;
    year: string;
  };
}

export interface UseRegistroReturn {
  flow: RegistroFlow;
  formData: RegistroFormData;
  loading: boolean;
  message: { type: 'success' | 'error'; text: string } | null;
  showPassword: boolean;
  paymentValidated: boolean | null;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSelectChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  handleDateChange: (field: 'day' | 'month' | 'year', value: string) => void;
  handleSubmitNewUser: (e: React.FormEvent) => void;
  handleSubmitLogin: (e: React.FormEvent) => void;
  setShowPassword: (value: boolean) => void;
}

export function useRegistro(paymentRef: string | null): UseRegistroReturn {
  const router = useRouter();
  const { signUp } = useAuth();

  const [flow, setFlow] = useState<RegistroFlow>('loading');
  const [paymentValidated, setPaymentValidated] = useState<boolean | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState<RegistroFormData>({
    nombre: '',
    apellido: '',
    email: '',
    contraseña: '',
    especialidad: '',
    pais: '',
    fechaNacimiento: { day: '', month: '', year: '' },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let processedValue = value;
    if (name === 'nombre' || name === 'apellido') {
      processedValue = value
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    }
    setFormData(prev => ({ ...prev, [name]: processedValue }));
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (field: 'day' | 'month' | 'year', value: string) => {
    setFormData(prev => ({
      ...prev,
      fechaNacimiento: { ...prev.fechaNacimiento, [field]: value },
    }));
  };

  const processRenewal = useCallback(async (ref: string) => {
    try {
      const now = new Date();
      const newExpirationDate = new Date(now.setMonth(now.getMonth() + 1));

      const response = await fetch('/api/auth/renew-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          external_reference: ref,
          subscription_expires_at: newExpirationDate.toISOString(),
        }),
      });

      if (response.ok) {
        await fetch('/api/epayco/mark-session-used', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ external_reference: ref }),
        });

        setMessage({
          type: 'success',
          text: '¡Renovación exitosa! Tu suscripción Premium ha sido extendida.',
        });

        setTimeout(() => router.push('/perfil'), 3000);
      } else {
        setMessage({ type: 'error', text: 'Error al procesar la renovación' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Error inesperado al procesar la renovación' });
    }
  }, [router]);

  // Validar sesión de pago al cargar
  useEffect(() => {
    if (!paymentRef) {
      router.replace('/suscripcion');
      return;
    }

    const validatePayment = async () => {
      try {
        const response = await fetch(`/api/epayco/validate-session?ref=${paymentRef}`);
        const data = await response.json();

        if (!data.isValid) {
          router.replace(`/suscripcion?payment_error=${encodeURIComponent(data.error || 'Pago no completado')}`);
          return;
        }

        setPaymentValidated(true);

        // Verificar si hay sesión activa (usuario logueado)
        const sessionResponse = await fetch('/api/auth/session', { credentials: 'include' });
        const sessionData = await sessionResponse.json();

        if (sessionData.data?.user) {
          // Flujo 1: usuario logueado → renovación directa
          setFlow('renewal');
          await processRenewal(paymentRef);
          return;
        }

        // Prellenar email del pagador
        if (data.payer_email) {
          setFormData(prev => ({ ...prev, email: data.payer_email }));
        }

        // Flujo 2 o 3 según si el usuario existe
        if (data.is_existing_user) {
          setFlow('existing_user');
        } else {
          setFlow('new_user');
        }

      } catch {
        router.replace('/suscripcion?payment_error=Error+al+validar+el+pago');
      }
    };

    validatePayment();
  }, [paymentRef, processRenewal, router]);

  const handleSubmitNewUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentValidated) return;

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
        paymentRef || undefined
      );

      if (error) {
        setMessage({ type: 'error', text: `Error: ${error.message}` });
        return;
      }

      if (paymentRef) {
        await fetch('/api/epayco/mark-session-used', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ external_reference: paymentRef }),
        });
      }

      setMessage({ type: 'success', text: '¡Registro exitoso! Tu suscripción Premium está activa.' });
      setTimeout(() => router.push('/perfil'), 2000);

    } catch {
      setMessage({ type: 'error', text: 'Error inesperado. Por favor intenta de nuevo.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentValidated) return;

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: formData.email,
          password: formData.contraseña,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        setMessage({ type: 'error', text: 'Contraseña incorrecta. Intenta de nuevo.' });
        return;
      }

      // Login exitoso → procesar renovación
      await processRenewal(paymentRef!);

    } catch {
      setMessage({ type: 'error', text: 'Error inesperado. Por favor intenta de nuevo.' });
    } finally {
      setLoading(false);
    }
  };

  return {
    flow,
    formData,
    loading,
    message,
    showPassword,
    paymentValidated,
    handleInputChange,
    handleSelectChange,
    handleDateChange,
    handleSubmitNewUser,
    handleSubmitLogin,
    setShowPassword,
  };
}