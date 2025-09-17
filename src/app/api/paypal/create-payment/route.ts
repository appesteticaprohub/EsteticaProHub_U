import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createPayPalPayment, createPayPalSubscription, createPayPalSubscriptionPlan } from '@/lib/paypal';

// Generar referencia externa única
function generateExternalReference(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 9);
  return `${timestamp}-${random}`;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const isAutoRenewal = process.env.ENABLE_AUTO_RENEWAL === 'true';

    // Crear payment session en base de datos
    const externalReference = generateExternalReference();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48); // Expira en 48 horas

    const sessionData = {
      external_reference: externalReference,
      amount: 10.00,
      expires_at: expiresAt.toISOString(),
      status: 'pending',
      subscription_type: isAutoRenewal ? 'recurring' : 'one_time'
    };

    const { data: session, error: dbError } = await supabase
      .from('payment_sessions')
      .insert(sessionData)
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: 'Error creating payment session' },
        { status: 500 }
      );
    }

    if (isAutoRenewal) {
      // ==================== FLUJO DE SUSCRIPCIÓN ====================
      
      // Primero crear el plan (en producción esto se haría una sola vez)
      const plan = await createPayPalSubscriptionPlan();
      
      if (plan.error) {
        console.error('PayPal Plan error:', plan.error);
        return NextResponse.json(
          { error: 'Error creating subscription plan' },
          { status: 500 }
        );
      }

      // Crear suscripción con el plan
      const paypalSubscription = await createPayPalSubscription(externalReference, plan.id);

      if (paypalSubscription.error) {
        console.error('PayPal Subscription error:', paypalSubscription.error);
        return NextResponse.json(
          { error: 'Error creating PayPal subscription' },
          { status: 500 }
        );
      }

      // Actualizar session con PayPal subscription ID
      await supabase
        .from('payment_sessions')
        .update({ paypal_subscription_id: paypalSubscription.id })
        .eq('external_reference', externalReference);

      // Encontrar URL de aprobación de PayPal
      const approvalUrl = paypalSubscription.links?.find(
        (link: any) => link.rel === 'approve'
      )?.href;

      return NextResponse.json({
        success: true,
        payment_type: 'subscription',
        paypal_subscription_id: paypalSubscription.id,
        approval_url: approvalUrl,
        external_reference: externalReference
      });

    } else {
      // ==================== FLUJO DE PAGO ÚNICO (EXISTENTE) ====================
      
      // Crear pago en PayPal
      const paypalPayment = await createPayPalPayment(externalReference);

      if (paypalPayment.error) {
        console.error('PayPal error:', paypalPayment.error);
        return NextResponse.json(
          { error: 'Error creating PayPal payment' },
          { status: 500 }
        );
      }

      // Actualizar session con PayPal payment ID
      await supabase
        .from('payment_sessions')
        .update({ paypal_payment_id: paypalPayment.id })
        .eq('external_reference', externalReference);

      // Encontrar URL de aprobación de PayPal
      const approvalUrl = paypalPayment.links?.find(
        (link: any) => link.rel === 'approval_url'
      )?.href;

      return NextResponse.json({
        success: true,
        payment_type: 'one_time',
        paypal_payment_id: paypalPayment.id,
        approval_url: approvalUrl,
        external_reference: externalReference
      });
    }

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}