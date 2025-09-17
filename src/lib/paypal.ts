export const PAYPAL_CONFIG = {
  currency: 'USD',
  amount: '10.00',
  environment: process.env.PAYPAL_ENVIRONMENT || 'sandbox',
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
  clientId: process.env.PAYPAL_CLIENT_ID!,
  clientSecret: process.env.PAYPAL_CLIENT_SECRET!,
};

const PAYPAL_BASE_URL = PAYPAL_CONFIG.environment === 'production' 
  ? 'https://api.paypal.com'
  : 'https://api.sandbox.paypal.com';

// Obtener token de acceso de PayPal
async function getPayPalAccessToken(): Promise<string> {
  const auth = Buffer.from(`${PAYPAL_CONFIG.clientId}:${PAYPAL_CONFIG.clientSecret}`).toString('base64');
  
  const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const data = await response.json();
  return data.access_token;
}

// Crear pago en PayPal
export async function createPayPalPayment(externalReference: string) {
  const accessToken = await getPayPalAccessToken();
  
  const payment = {
    intent: 'sale',
    payer: {
      payment_method: 'paypal'
    },
    redirect_urls: {
      return_url: `${PAYPAL_CONFIG.baseUrl}/registro?ref=${externalReference}`,
      cancel_url: `${PAYPAL_CONFIG.baseUrl}/suscripcion?cancelled=true`
    },
    transactions: [{
      amount: {
        total: PAYPAL_CONFIG.amount,
        currency: PAYPAL_CONFIG.currency
      },
      description: 'Suscripción Premium EsteticaProHub',
      custom: externalReference
    }]
  };

  const response = await fetch(`${PAYPAL_BASE_URL}/v1/payments/payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payment),
  });

  return response.json();
}

// Verificar pago en PayPal
export async function verifyPayPalPayment(paymentId: string) {
  const accessToken = await getPayPalAccessToken();
  
  const response = await fetch(`${PAYPAL_BASE_URL}/v1/payments/payment/${paymentId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  return response.json();
}