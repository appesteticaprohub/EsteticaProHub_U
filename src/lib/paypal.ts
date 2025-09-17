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

// ==================== FUNCIONES PARA SUSCRIPCIONES ====================

// Crear producto en PayPal (se ejecuta una vez)
export async function createPayPalProduct() {
  const accessToken = await getPayPalAccessToken();
  
  const product = {
    name: "EsteticaProHub Premium",
    description: "Suscripción premium mensual para EsteticaProHub - Acceso completo a contenido exclusivo y funciones avanzadas",
    type: "SERVICE",
    category: "SOFTWARE",
    image_url: `${PAYPAL_CONFIG.baseUrl}/logo.png`, // Opcional
    home_url: PAYPAL_CONFIG.baseUrl
  };

  const response = await fetch(`${PAYPAL_BASE_URL}/v1/catalogs/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(product),
  });

  return response.json();
}

// Crear plan de suscripción en PayPal (se ejecuta una vez)
export async function createPayPalSubscriptionPlan() {
  const accessToken = await getPayPalAccessToken();
  
  // Primero crear el producto si no existe
  console.log('🛍️ Creando producto PayPal...');
  const product = await createPayPalProduct();
  
  console.log('🛍️ Respuesta del producto:', JSON.stringify(product, null, 2));
  
  if (product.error || !product.id) {
    console.error('❌ Error creando producto:', product);
    return { error: 'Failed to create product', details: product };
  }
  
  console.log('✅ Producto creado con ID:', product.id);
  
  const plan = {
    product_id: product.id, // Usar el ID del producto recién creado
    name: "EsteticaProHub Premium Monthly",
    description: "Suscripción mensual premium para EsteticaProHub",
    status: "ACTIVE",
    billing_cycles: [{
      frequency: {
        interval_unit: "MONTH",
        interval_count: 1
      },
      tenure_type: "REGULAR",
      sequence: 1,
      total_cycles: 0, // 0 = infinito hasta que se cancele
      pricing_scheme: {
        fixed_price: {
          value: PAYPAL_CONFIG.amount,
          currency_code: PAYPAL_CONFIG.currency
        }
      }
    }],
    payment_preferences: {
      auto_bill_outstanding: true,
      setup_fee_failure_action: "CONTINUE",
      payment_failure_threshold: 3
    }
  };

  const response = await fetch(`${PAYPAL_BASE_URL}/v1/billing/plans`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(plan),
  });

  return response.json();
}

// Crear suscripción en PayPal
export async function createPayPalSubscription(externalReference: string, planId: string) {
  const accessToken = await getPayPalAccessToken();
  
  const subscription = {
    plan_id: planId,
    custom_id: externalReference, // Para identificar la sesión
    application_context: {
      brand_name: "EsteticaProHub",
      locale: "es-CO",
      shipping_preference: "NO_SHIPPING",
      user_action: "SUBSCRIBE_NOW",
      payment_method: {
        payer_selected: "PAYPAL",
        payee_preferred: "IMMEDIATE_PAYMENT_REQUIRED"
      },
      return_url: `${PAYPAL_CONFIG.baseUrl}/registro?ref=${externalReference}`,
      cancel_url: `${PAYPAL_CONFIG.baseUrl}/suscripcion?cancelled=true`
    }
  };

  const response = await fetch(`${PAYPAL_BASE_URL}/v1/billing/subscriptions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(subscription),
  });

  return response.json();
}

// Verificar estado de suscripción
export async function verifyPayPalSubscription(subscriptionId: string) {
  const accessToken = await getPayPalAccessToken();
  
  const response = await fetch(`${PAYPAL_BASE_URL}/v1/billing/subscriptions/${subscriptionId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  return response.json();
}

// Cancelar suscripción
export async function cancelPayPalSubscription(subscriptionId: string, reason: string = "Usuario canceló suscripción") {
  const accessToken = await getPayPalAccessToken();
  
  const response = await fetch(`${PAYPAL_BASE_URL}/v1/billing/subscriptions/${subscriptionId}/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      reason: reason
    }),
  });

  return response;
}