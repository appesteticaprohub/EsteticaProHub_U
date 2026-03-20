export const PAYPAL_CONFIG = {
  currency: 'USD',
  amount: '10.00', // Fallback por defecto
  environment: process.env.PAYPAL_ENVIRONMENT || 'sandbox',
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000',
  clientId: process.env.PAYPAL_CLIENT_ID!,
  clientSecret: process.env.PAYPAL_CLIENT_SECRET!,
};

const PAYPAL_BASE_URL = PAYPAL_CONFIG.environment === 'live' 
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

// Obtener token de acceso de PayPal
async function getPayPalAccessToken(): Promise<string> {
  try {
    console.log('🔐 Obteniendo token de PayPal...');
    console.log('🌍 Environment:', PAYPAL_CONFIG.environment);
    console.log('🔑 Client ID presente:', !!PAYPAL_CONFIG.clientId);
    console.log('🔐 Client Secret presente:', !!PAYPAL_CONFIG.clientSecret);
    console.log('🌐 Base URL:', PAYPAL_BASE_URL);

    if (!PAYPAL_CONFIG.clientId || !PAYPAL_CONFIG.clientSecret) {
      throw new Error('PayPal credentials not configured');
    }

    const auth = Buffer.from(`${PAYPAL_CONFIG.clientId}:${PAYPAL_CONFIG.clientSecret}`).toString('base64');
    
    const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error obteniendo token PayPal:', response.status, errorText);
      throw new Error(`PayPal token error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.access_token) {
      console.error('❌ Token no recibido:', data);
      throw new Error('No access token in response');
    }

    console.log('✅ Token de PayPal obtenido correctamente');
    return data.access_token;
  } catch (error) {
    console.error('💥 Error crítico obteniendo token PayPal:', error);
    throw error;
  }
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
  try {
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
      } else {
        const errorText = await searchResponse.text();
        console.log('⚠️ Error buscando productos:', searchResponse.status, errorText);
      }
    } catch (searchError) {
      console.log('⚠️ Error buscando productos existentes:', searchError);
    }

    // Si no existe, crear nuevo producto
    console.log('🛍️ Creando nuevo producto...');
    const product = {
      name: "EsteticaProHub Premium",
      description: "Suscripción premium mensual para EsteticaProHub - Acceso completo a contenido exclusivo y funciones avanzadas",
      type: "SERVICE",
      category: "SOFTWARE",
      home_url: PAYPAL_CONFIG.baseUrl.replace(/\/$/, '') // Remover slash final si existe
    };

    const response = await fetch(`${PAYPAL_BASE_URL}/v1/catalogs/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(product),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error creando producto:', response.status, errorText);
      return { error: `Product creation failed: ${response.status}`, details: errorText };
    }

    const newProduct = await response.json();
    console.log('✅ Producto creado:', newProduct.id);
    return newProduct;
  } catch (error) {
    console.error('💥 Error en createOrGetPayPalProduct:', error);
    return { error: 'Exception in product creation', details: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function createOrGetPayPalSubscriptionPlan(dynamicPrice?: string) {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const targetPrice = dynamicPrice || PAYPAL_CONFIG.amount;

    // 1. Buscar PAYPAL_PLAN_ID guardado en app_settings
    console.log('🔍 Buscando PAYPAL_PLAN_ID en app_settings...');
    const { data: planSetting } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'PAYPAL_PLAN_ID')
      .single();

    if (planSetting?.value) {
      console.log('✅ Plan existente encontrado en BD:', planSetting.value);
      return { id: planSetting.value };
    }

    console.log('⚠️ No hay plan guardado, creando uno nuevo...');

    // 2. Obtener o crear el producto
    console.log('🛍️ Obteniendo producto PayPal...');
    const product = await createOrGetPayPalProduct();

    console.log('🛍️ Respuesta del producto:', JSON.stringify(product, null, 2));

    if (product.error || !product.id) {
      console.error('❌ Error con producto:', product);
      return { error: 'Failed to get/create product', details: product };
    }

    console.log('✅ Producto disponible con ID:', product.id);

    // 3. Crear nuevo plan
    console.log('📋 Creando nuevo plan con precio:', targetPrice);
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
            value: targetPrice,
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

    const accessToken = await getPayPalAccessToken();
    const response = await fetch(`${PAYPAL_BASE_URL}/v1/billing/plans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(plan),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error creando plan:', response.status, errorText);
      return { error: `Plan creation failed: ${response.status}`, details: errorText };
    }

    const newPlan = await response.json();
    console.log('✅ Plan creado:', newPlan.id);

    // 4. Guardar el nuevo plan ID en app_settings
    const { error: saveError } = await supabase
      .from('app_settings')
      .update({ value: newPlan.id })
      .eq('key', 'PAYPAL_PLAN_ID');

    if (saveError) {
      console.error('⚠️ Error guardando PAYPAL_PLAN_ID en BD:', saveError);
    } else {
      console.log('✅ PAYPAL_PLAN_ID guardado en BD:', newPlan.id);
    }

    return newPlan;
  } catch (error) {
    console.error('💥 Error en createOrGetPayPalSubscriptionPlan:', error);
    return { error: 'Exception in plan creation', details: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Crear suscripción en PayPal
export async function createPayPalSubscription(externalReference: string, planId: string) {
  try {
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

    console.log('📤 Enviando suscripción a PayPal:', JSON.stringify(subscription, null, 2));

    const response = await fetch(`${PAYPAL_BASE_URL}/v1/billing/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(subscription),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error creando suscripción:', response.status, errorText);
      return { error: `Subscription creation failed: ${response.status}`, details: errorText };
    }

    const newSubscription = await response.json();
    console.log('✅ Suscripción creada:', newSubscription.id);
    return newSubscription;
  } catch (error) {
    console.error('💥 Error en createPayPalSubscription:', error);
    return { error: 'Exception in subscription creation', details: error instanceof Error ? error.message : 'Unknown error' };
  }
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

// Reactivar suscripción cancelada
export async function reactivatePayPalSubscription(subscriptionId: string) {
  try {
    const accessToken = await getPayPalAccessToken();
    
    console.log('🔄 Intentando reactivar suscripción en PayPal:', subscriptionId);
    
    const response = await fetch(`${PAYPAL_BASE_URL}/v1/billing/subscriptions/${subscriptionId}/activate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        reason: "Usuario reactivó suscripción desde perfil"
      }),
    });

    console.log('🔄 Respuesta de PayPal para reactivación:', response.status);

    if (response.status === 204) {
      // 204 significa éxito sin contenido (típico para reactivaciones)
      console.log('✅ Suscripción reactivada exitosamente en PayPal');
      return { success: true };
    } else {
      const errorText = await response.text().catch(() => 'No response body');
      console.error('❌ Error reactivando en PayPal:', response.status, errorText);
      return { 
        success: false, 
        error: `PayPal error: ${response.status}`,
        details: errorText 
      };
    }
  } catch (error) {
    console.error('💥 Excepción reactivando suscripción en PayPal:', error);
    return { 
      success: false, 
      error: 'Exception calling PayPal',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
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