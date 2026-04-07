// src/lib/epayco.ts
import { createClient } from '@supabase/supabase-js';

const EPAYCO_CONFIG = {
  publicKey: process.env.EPAYCO_PUBLIC_KEY!,
  privateKey: process.env.EPAYCO_PRIVATE_KEY!,
  pCustId: process.env.EPAYCO_P_CUST_ID!,
  pKey: process.env.EPAYCO_P_KEY!,
  test: process.env.EPAYCO_TEST === 'true',
  baseUrl: process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001',
  currency: 'USD',
};

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Generar referencia externa única
export function generateExternalReference(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 9);
  return `ep-${timestamp}-${random}`;
}

// Obtener precio dinámico desde app_settings
export async function getDynamicPrice(): Promise<string> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'SUBSCRIPTION_PRICE')
      .single();

    if (!error && data?.value) {
      return data.value;
    }

    return '10.00'; // Fallback
  } catch (error) {
    console.error('Error obteniendo precio dinámico:', error);
    return '10.00';
  }
}

// Construir parámetros del checkout de ePayco
export function buildEpaycoCheckoutUrl(params: {
  externalReference: string;
  amount: string;
  description?: string;
}): string {
  const { externalReference, amount, description } = params;

  const checkoutParams = new URLSearchParams({
    p_cust_id_cliente: EPAYCO_CONFIG.pCustId,
    p_key: EPAYCO_CONFIG.publicKey,
    p_id_invoice: externalReference,
    p_description: description || 'Suscripción Premium EsteticaProHub - 1 mes',
    p_amount: amount,
    p_tax: '0.00',
    p_tax_base: amount,
    p_currency_code: EPAYCO_CONFIG.currency,
    p_test_request: EPAYCO_CONFIG.test ? '1' : '0',
    p_url_response: `${EPAYCO_CONFIG.baseUrl}/registro?ref=${externalReference}`,
    p_url_confirmation: `${EPAYCO_CONFIG.baseUrl}/api/epayco/webhook`,
    p_confirm_method: 'POST',
    p_extra1: externalReference,
  });

  return `https://checkout.epayco.co/payment.cgi?${checkoutParams.toString()}`;
}

// Verificar firma del webhook de ePayco
export function verifyEpaycoSignature(data: Record<string, string>): boolean {
  try {
    const crypto = require('crypto');

    const {
      x_ref_payco,
      x_transaction_id,
      x_amount,
      x_currency_code,
      x_signature,
    } = data;

    if (!x_ref_payco || !x_transaction_id || !x_amount || !x_currency_code || !x_signature) {
      console.error('❌ Faltan campos para verificar firma ePayco');
      return false;
    }

    const signatureString = `${EPAYCO_CONFIG.pCustId}^${EPAYCO_CONFIG.pKey}^${x_ref_payco}^${x_transaction_id}^${x_amount}^${x_currency_code}`;
    const calculatedSignature = crypto.createHash('sha256').update(signatureString).digest('hex');

    const isValid = calculatedSignature === x_signature;
    console.log(`🔐 Verificación firma ePayco: ${isValid ? '✅ válida' : '❌ inválida'}`);
    return isValid;
  } catch (error) {
    console.error('❌ Error verificando firma ePayco:', error);
    return false;
  }
}

// Códigos de respuesta de ePayco
export function isEpaycoPaymentAccepted(responseCode: string): boolean {
  // 1 = Aceptada, 3 = Pendiente
  return responseCode === '1';
}

export function isEpaycoPaymentPending(responseCode: string): boolean {
  return responseCode === '3';
}

export { EPAYCO_CONFIG };