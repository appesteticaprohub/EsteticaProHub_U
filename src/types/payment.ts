export interface PaymentSession {
  session_id: string;
  external_reference: string;
  paypal_payment_id?: string;
  paypal_subscription_id?: string; // NUEVO: Para suscripciones
  status: 'pending' | 'paid' | 'used' | 'expired' | 'active_subscription' | 'cancelled_subscription'; // NUEVOS estados
  amount: number;
  created_at: string;
  expires_at: string;
  user_id?: string;
  subscription_type?: 'one_time' | 'recurring'; // NUEVO: Tipo de pago
}

export interface CreatePaymentRequest {
  amount: number;
  currency: string;
  return_url: string;
  cancel_url: string;
  external_reference: string;
}

// Interfaces para suscripciones PayPal
export interface PayPalSubscription {
  id: string;
  status: 'APPROVAL_PENDING' | 'APPROVED' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED' | 'EXPIRED';
  plan_id: string;
  subscriber: {
    email_address?: string;
  };
  billing_info: {
    cycle_executions: Array<{
      tenure_type: string;
      sequence: number;
      cycles_completed: number;
      cycles_remaining: number;
    }>;
  };
}

export interface CreateSubscriptionRequest {
  plan_id: string;
  return_url: string;
  cancel_url: string;
  external_reference: string;
}

export interface PayPalWebhookEvent {
  id: string;
  event_type: string;
  resource: {
    id: string;
    state?: string;
    custom?: string;
    amount?: {
      total: string;
      currency: string;
    };
  };
}