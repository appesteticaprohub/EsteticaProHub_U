import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyPayPalPayment } from '@/lib/paypal';

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
    const { paymentId, payerId, externalReference } = await request.json();
    console.log('Received params:', { paymentId, payerId, externalReference });

    if (!paymentId || !payerId || !externalReference) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Primero ejecutar el pago en PayPal
    console.log('About to execute PayPal payment:', paymentId);

    const accessToken = await getPayPalAccessToken();

    const executePayload = {
      payer_id: payerId
    };

    const executeResponse = await fetch(`https://api.sandbox.paypal.com/v1/payments/payment/${paymentId}/execute`, {
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

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

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