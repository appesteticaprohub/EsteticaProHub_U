import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyPayPalSubscription, capturePayPalOrder } from '@/lib/paypal';
import { isAutoRenewalEnabled } from '@/lib/settings';

export async function POST(request: NextRequest) {
  try {
    const { paymentId, externalReference, subscriptionId } = await request.json();
    console.log('Received params:', { paymentId, externalReference, subscriptionId });

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
      // ==================== FLUJO DE PAGO ÚNICO API v2 ====================
      console.log('💰 Processing one-time payment (API v2):', paymentId);

      // Capturar la orden en PayPal API v2
      const capturedOrder = await capturePayPalOrder(paymentId);
      console.log('💰 PayPal capture response:', JSON.stringify(capturedOrder, null, 2));

      if (capturedOrder.status !== 'COMPLETED') {
        console.error('❌ Order not completed:', capturedOrder.status);
        return NextResponse.json(
          { error: 'Payment not completed', details: capturedOrder.status },
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

      console.log('✅ Pago único completado y sesión actualizada');
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