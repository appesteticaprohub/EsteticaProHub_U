import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyPayPalPayment, verifyPayPalSubscription } from '@/lib/paypal';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('PayPal Webhook received:', body);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // ==================== EVENTOS DE PAGO ÚNICO ====================
    if (body.event_type === 'PAYMENT.SALE.COMPLETED') {
      const paymentId = body.resource?.parent_payment;
      const customField = body.resource?.custom;

      if (!paymentId || !customField) {
        console.error('Missing payment ID or custom field');
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }

      // Verificar el pago en PayPal
      const paypalPayment = await verifyPayPalPayment(paymentId);
      
      if (paypalPayment.state !== 'approved') {
        console.error('Payment not approved:', paypalPayment.state);
        return NextResponse.json({ error: 'Payment not approved' }, { status: 400 });
      }

      // Actualizar payment session a 'paid'
      const { error } = await supabase
        .from('payment_sessions')
        .update({ 
          status: 'paid',
          paypal_payment_id: paymentId
        })
        .eq('external_reference', customField);

      if (error) {
        console.error('Database error:', error);
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
      }

      console.log(`Payment session ${customField} marked as paid`);
      return NextResponse.json({ message: 'Payment confirmed' });
    }

    // ==================== EVENTOS DE SUSCRIPCIÓN ====================
    
    // Suscripción activada
    if (body.event_type === 'BILLING.SUBSCRIPTION.ACTIVATED') {
      const subscriptionId = body.resource?.id;
      const customId = body.resource?.custom_id;

      if (!subscriptionId || !customId) {
        console.error('Missing subscription ID or custom ID');
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }

      const { error } = await supabase
        .from('payment_sessions')
        .update({ 
          status: 'active_subscription',
          paypal_subscription_id: subscriptionId
        })
        .eq('external_reference', customId);

      if (error) {
        console.error('Database error activating subscription:', error);
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
      }

      console.log(`Subscription ${subscriptionId} activated for session ${customId}`);
      return NextResponse.json({ message: 'Subscription activated' });
    }

    // Pago de suscripción completado (renovación mensual)
    if (body.event_type === 'BILLING.SUBSCRIPTION.PAYMENT.COMPLETED') {
      const subscriptionId = body.resource?.billing_agreement_id;
      
      if (!subscriptionId) {
        console.error('Missing subscription ID in payment completed event');
        return NextResponse.json({ error: 'Missing subscription ID' }, { status: 400 });
      }

      // Extender la fecha de expiración del usuario por 1 mes
      const { data: session } = await supabase
        .from('payment_sessions')
        .select('*')
        .eq('paypal_subscription_id', subscriptionId)
        .eq('status', 'active_subscription')
        .single();

      if (session && session.user_id) {
        const newExpirationDate = new Date();
        newExpirationDate.setMonth(newExpirationDate.getMonth() + 1);

        await supabase
          .from('profiles')
          .update({ 
            subscription_expires_at: newExpirationDate.toISOString(),
            subscription_status: 'Active'
          })
          .eq('id', session.user_id);

        console.log(`Subscription ${subscriptionId} payment completed, extended expiration`);
      }

      return NextResponse.json({ message: 'Subscription payment processed' });
    }

    // Suscripción cancelada
    if (body.event_type === 'BILLING.SUBSCRIPTION.CANCELLED') {
      const subscriptionId = body.resource?.id;

      if (!subscriptionId) {
        console.error('Missing subscription ID in cancellation event');
        return NextResponse.json({ error: 'Missing subscription ID' }, { status: 400 });
      }

      // Actualizar estado de la sesión
      const { error } = await supabase
        .from('payment_sessions')
        .update({ status: 'cancelled_subscription' })
        .eq('paypal_subscription_id', subscriptionId);

      if (error) {
        console.error('Database error cancelling subscription:', error);
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
      }

      console.log(`Subscription ${subscriptionId} cancelled`);
      return NextResponse.json({ message: 'Subscription cancelled' });
    }

    // Pago de suscripción fallido
    if (body.event_type === 'BILLING.SUBSCRIPTION.PAYMENT.FAILED') {
      const subscriptionId = body.resource?.billing_agreement_id;
      
      if (subscriptionId) {
        console.log(`Subscription ${subscriptionId} payment failed - may retry automatically`);
        // PayPal intentará automáticamente según la configuración del plan
      }

      return NextResponse.json({ message: 'Subscription payment failure noted' });
    }

    // Evento no manejado
    console.log(`Unhandled webhook event type: ${body.event_type}`);
    return NextResponse.json({ message: 'Event type not handled' });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}