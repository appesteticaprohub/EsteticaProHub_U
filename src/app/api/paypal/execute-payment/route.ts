import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyPayPalPayment, verifyPayPalSubscription } from '@/lib/paypal';
import { isAutoRenewalEnabled } from '@/lib/settings';

// Función para obtener token de acceso
async function getPayPalAccessToken(): Promise<string> {
  const PAYPAL_BASE_URL = process.env.PAYPAL_ENVIRONMENT === 'production' 
    ? 'https://api.paypal.com'
    : 'https://api.sandbox.paypal.com';

  const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64');
  
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

export async function POST(request: NextRequest) {
  try {
    const { paymentId, payerId, externalReference, subscriptionId } = await request.json();
    console.log('Received params:', { paymentId, payerId, externalReference, subscriptionId });

    if (!externalReference || (!paymentId && !subscriptionId)) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Obtener información de la sesión para determinar el tipo
    const { data: session, error: sessionError } = await supabase
      .from('payment_sessions')
      .select('*')
      .eq('external_reference', externalReference)
      .single();

    if (sessionError || !session) {
      console.error('Session not found:', sessionError);
      return NextResponse.json(
        { error: 'Payment session not found' },
        { status: 400 }
      );
    }

    const isAutoRenewal = await isAutoRenewalEnabled();

    if (isAutoRenewal && subscriptionId) {
      // ==================== FLUJO DE SUSCRIPCIÓN ====================
      console.log('Processing subscription:', subscriptionId);

      // Verificar estado de la suscripción en PayPal
      const subscriptionDetails = await verifyPayPalSubscription(subscriptionId);
      console.log('PayPal subscription details:', subscriptionDetails);

      if (subscriptionDetails.status !== 'ACTIVE') {
        return NextResponse.json(
          { error: 'Subscription not active' },
          { status: 400 }
        );
      }

      // Actualizar payment session para suscripción activa
      const { error } = await supabase
        .from('payment_sessions')
        .update({ 
          status: 'paid', // Usar 'paid' en lugar de 'active_subscription'
          paypal_subscription_id: subscriptionId
        })
        .eq('external_reference', externalReference);

      if (error) {
        console.error('Database error:', error);
        return NextResponse.json(
          { error: 'Database update failed' },
          { status: 500 }
        );
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Subscription activated',
        subscription_id: subscriptionId 
      });

    } else if (!isAutoRenewal && paymentId) {
      // ==================== FLUJO DE PAGO ÚNICO (EXISTENTE) ====================
      console.log('Processing one-time payment:', paymentId);

      if (!payerId) {
        return NextResponse.json(
          { error: 'Missing payerId for one-time payment' },
          { status: 400 }
        );
      }

      const accessToken = await getPayPalAccessToken();

      const executePayload = {
        payer_id: payerId
      };

      const PAYPAL_BASE_URL = process.env.PAYPAL_ENVIRONMENT === 'production' 
        ? 'https://api.paypal.com'
        : 'https://api.sandbox.paypal.com';

      const executeResponse = await fetch(`${PAYPAL_BASE_URL}/v1/payments/payment/${paymentId}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(executePayload),
      });

      const executedPayment = await executeResponse.json();
      console.log('PayPal execution response:', executedPayment);

      if (executedPayment.state !== 'approved') {
        return NextResponse.json(
          { error: 'Payment not approved' },
          { status: 400 }
        );
      }

      // Actualizar payment session a 'paid'
      const { error } = await supabase
        .from('payment_sessions')
        .update({ 
          status: 'paid',
          paypal_payment_id: paymentId
        })
        .eq('external_reference', externalReference);

      if (error) {
        console.error('Database error:', error);
        return NextResponse.json(
          { error: 'Database update failed' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, message: 'Payment confirmed' });

    } else {
      return NextResponse.json(
        { error: 'Invalid payment configuration' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Execute payment error details:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}