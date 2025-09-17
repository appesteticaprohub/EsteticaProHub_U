export interface PaymentSession {
  session_id: string;
  external_reference: string;
  paypal_payment_id?: string;
  status: 'pending' | 'paid' | 'used' | 'expired';
  amount: number;
  created_at: string;
  expires_at: string;
  user_id?: string;
}

export interface CreatePaymentRequest {
  amount: number;
  currency: string;
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