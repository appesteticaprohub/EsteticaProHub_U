export const PAYPAL_CONFIG = {
  currency: 'USD',
  amount: '10.00', // Fallback por defecto
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

// Crear o recuperar producto existente en PayPal
export async function createOrGetPayPalProduct() {
  const accessToken = await getPayPalAccessToken();
  
  // Primero intentar buscar producto existente por nombre
  console.log('🔍 Buscando producto existente...');
  
  try {
    const searchResponse = await fetch(`${PAYPAL_BASE_URL}/v1/catalogs/products?page_size=20`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      const existingProduct = searchData.products?.find(
        (product: { id: string; name: string }) => product.name === "EsteticaProHub Premium"
      );

      if (existingProduct) {
        console.log('✅ Producto existente encontrado:', existingProduct.id);
        return existingProduct;
      }
    }
  } catch {
    console.log('⚠️ Error buscando productos existentes, creando nuevo...');
  }

  // Si no existe, crear nuevo producto
  console.log('🛍️ Creando nuevo producto...');
  const product = {
    name: "EsteticaProHub Premium",
    description: "Suscripción premium mensual para EsteticaProHub - Acceso completo a contenido exclusivo y funciones avanzadas",
    type: "SERVICE",
    category: "SOFTWARE",
    image_url: `${PAYPAL_CONFIG.baseUrl}/logo.png`,
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

export async function createOrGetPayPalSubscriptionPlan(dynamicPrice?: string) {
  const accessToken = await getPayPalAccessToken();
  
  // Obtener o crear el producto
  console.log('🛍️ Obteniendo producto PayPal...');
  const product = await createOrGetPayPalProduct();
  
  console.log('🛍️ Respuesta del producto:', JSON.stringify(product, null, 2));
  
  if (product.error || !product.id) {
    console.error('❌ Error con producto:', product);
    return { error: 'Failed to get/create product', details: product };
  }
  
  console.log('✅ Producto disponible con ID:', product.id);
  
  // Buscar plan existente para este producto
  console.log('🔍 Buscando plan existente...');
  
  try {
    const searchResponse = await fetch(`${PAYPAL_BASE_URL}/v1/billing/plans?product_id=${product.id}&page_size=20`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      const targetPrice = dynamicPrice || PAYPAL_CONFIG.amount;
      const existingPlan = searchData.plans?.find(
        (plan: { id: string; name: string; status: string; billing_cycles?: Array<{ pricing_scheme?: { fixed_price?: { value: string } } }> }) => plan.name === "EsteticaProHub Premium Monthly" &&
                      plan.status === "ACTIVE" &&
                      plan.billing_cycles?.[0]?.pricing_scheme?.fixed_price?.value === targetPrice
      );

      if (existingPlan) {
        console.log('✅ Plan existente encontrado:', existingPlan.id);
        return existingPlan;
      }
    }
  } catch {
    console.log('⚠️ Error buscando planes existentes, creando nuevo...');
  }

  // Si no existe, crear nuevo plan
  console.log('📋 Creando nuevo plan...');
  const plan = {
    product_id: product.id,
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
      total_cycles: 0,
      pricing_scheme: {
            fixed_price: {
              value: dynamicPrice || PAYPAL_CONFIG.amount,
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

// ==================== NUEVAS FUNCIONES PARA ACTUALIZACIÓN DE PRECIOS ====================

// Actualizar precio de una suscripción específica
export async function updatePayPalSubscriptionPrice(subscriptionId: string, newPrice: string) {
  const accessToken = await getPayPalAccessToken();
  
  const response = await fetch(`${PAYPAL_BASE_URL}/v1/billing/subscriptions/${subscriptionId}/revise`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      plan_id: await getCurrentPlanId(),
      plan: {
        billing_cycles: [{
          frequency: {
            interval_unit: "MONTH",
            interval_count: 1
          },
          tenure_type: "REGULAR",
          sequence: 1,
          total_cycles: 0,
          pricing_scheme: {
            fixed_price: {
              value: newPrice,
              currency_code: PAYPAL_CONFIG.currency
            }
          }
        }]
      }
    }),
  });

  return response;
}

// Obtener ID del plan actual
async function getCurrentPlanId() {
  const plan = await createOrGetPayPalSubscriptionPlan();
  return plan.id;
}

// Actualizar múltiples suscripciones
export async function updateMultipleSubscriptionsPrices(subscriptions: Array<{id: string, paypal_subscription_id: string}>, newPrice: string) {
  const results = [];
  
  for (const subscription of subscriptions) {
    try {
      const result = await updatePayPalSubscriptionPrice(subscription.paypal_subscription_id, newPrice);
      results.push({
        userId: subscription.id,
        paypalSubscriptionId: subscription.paypal_subscription_id,
        success: result.status === 200,
        response: result.status
      });
    } catch (error) {
      results.push({
        userId: subscription.id,
        paypalSubscriptionId: subscription.paypal_subscription_id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
    // Pequeño delay entre llamadas para no saturar la API de PayPal
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return results;
}

// Obtener precio dinámico desde la base de datos
export async function getDynamicPrice() {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'SUBSCRIPTION_PRICE')
      .single();

    if (!error && data?.value) {
      return data.value;
    }
    
    return PAYPAL_CONFIG.amount; // Fallback
  } catch (error) {
    console.error('Error obteniendo precio dinámico:', error);
    return PAYPAL_CONFIG.amount; // Fallback
  }
}