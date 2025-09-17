import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyPayPalPayment } from '@/lib/paypal';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('PayPal Webhook received:', body);

    // Verificar que es un evento de pago completado
    if (body.event_type !== 'PAYMENT.SALE.COMPLETED') {
      return NextResponse.json({ message: 'Event type not handled' });
    }

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
      .eq('external_reference', customField);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
    }

    console.log(`Payment session ${customField} marked as paid`);
    return NextResponse.json({ message: 'Payment confirmed' });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}