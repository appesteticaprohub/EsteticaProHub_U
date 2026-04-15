// src/hooks/usePaymentPending.ts
import { useState, useEffect, useCallback, useRef } from 'react';

export type PendingStatus = 'waiting' | 'confirmed' | 'rejected' | 'expired';

export interface UsePaymentPendingReturn {
  status: PendingStatus;
  secondsElapsed: number;
  checkNow: () => void;
}

export function usePaymentPending(
  paymentRef: string | null,
  onConfirmed: (isExistingUser: boolean) => void,
  onRejected: () => void,
): UsePaymentPendingReturn {
  const [status, setStatus] = useState<PendingStatus>('waiting');
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const checkPaymentStatus = useCallback(async () => {
    if (!paymentRef || !isMountedRef.current) return;

    try {
      const response = await fetch(`/api/epayco/validate-session?ref=${paymentRef}`);
      const data = await response.json();

      if (!isMountedRef.current) return;

      // Pago confirmado
      if (data.isValid && !data.isPending) {
        setStatus('confirmed');
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        onConfirmed(data.is_existing_user ?? false);
        return;
      }

      // Sesión expirada o rechazada (no pending)
      if (!data.isValid && !data.isPending) {
        setStatus('expired');
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        onRejected();
        return;
      }

      // Sigue pending — continuar esperando

    } catch {
      // Error de red — continuar esperando silenciosamente
    }
  }, [paymentRef, onConfirmed, onRejected]);

  useEffect(() => {
    isMountedRef.current = true;

    if (!paymentRef) return;

    // Contador de segundos transcurridos
    intervalRef.current = setInterval(() => {
      if (isMountedRef.current) {
        setSecondsElapsed(prev => prev + 1);
      }
    }, 1000);

    // Polling cada 30 segundos
    pollIntervalRef.current = setInterval(() => {
      checkPaymentStatus();
    }, 30000);

    // Verificación inicial a los 5 segundos
    const initialCheck = setTimeout(() => {
      checkPaymentStatus();
    }, 5000);

    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      clearTimeout(initialCheck);
    };
  }, [paymentRef, checkPaymentStatus]);

  return {
    status,
    secondsElapsed,
    checkNow: checkPaymentStatus,
  };
}